import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule }        from 'firebase-functions/v2/scheduler';
import { createClient }      from '@supabase/supabase-js';
import Anthropic             from '@anthropic-ai/sdk';

admin.initializeApp();

// ── 지연 초기화 (배포 분석 시 env 미로드 대응) ──────────────
let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  }
  return _anthropic;
}

const LEGAL_SYSTEM_PROMPT = `당신은 법률사무소 청송의 AI 법률 상담 도우미입니다.
가맹점주들의 일상 영업 중 발생하는 법률 문제를 안내합니다.

[답변 원칙]
- 항상 한국어로 답변합니다
- 비전문가도 이해할 수 있는 쉬운 용어를 사용합니다
- 구체적인 사건 처리는 반드시 변호사 상담을 권유합니다

[다루는 분야]
형사(고소·고발·수사대응), 민사(손해배상·계약), 노무(임금·퇴직금·감독조사),
임대차(임대료·명도·권리금), 가맹(계약해지·갱신·영업지역)

[면책고지 - 매 답변 말미]
※ 이 답변은 일반적인 법률 정보이며 법률 자문이 아닙니다.`;

// ════════════════════════════════════════════════════════
// 1. AI 법률 상담
// ════════════════════════════════════════════════════════
export const chatWithAI = onCall(
  { region: 'asia-northeast3', secrets: ['CLAUDE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    if (!req.auth?.token?.active) throw new HttpsError('permission-denied', '이용 권한이 없습니다.');

    const { caseId, message } = req.data as { caseId: string; message: string };

    const { data: caseData } = await getSupabase().from('carelaw_cases').select('user_uid, brand_id').eq('id', caseId).single();
    if (!caseData || caseData.user_uid !== uid) throw new HttpsError('permission-denied', '이 케이스에 접근 권한이 없습니다.');

    // 이전 대화 로드 (최근 20개)
    const { data: history } = await getSupabase()
      .from('carelaw_messages')
      .select('role, content')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true })
      .limit(20);

    // 사용자 메시지 저장
    await getSupabase().from('carelaw_messages').insert({ case_id: caseId, role: 'user', content: message });

    // Claude API 호출
    const response = await getAnthropic().messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     LEGAL_SYSTEM_PROMPT,
      messages:   [
        ...(history ?? []).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: message },
      ],
    });

    const aiText = response.content[0].type === 'text' ? response.content[0].text : '';

    // AI 응답 저장 + 케이스 상태 업데이트
    await Promise.all([
      getSupabase().from('carelaw_messages').insert({ case_id: caseId, role: 'assistant', content: aiText }),
      getSupabase().from('carelaw_cases').update({ status: 'consulting', updated_at: new Date().toISOString() }).eq('id', caseId),
    ]);

    return { message: aiText };
  }
);

// ════════════════════════════════════════════════════════
// 2. 점주 초대 링크 생성
// ════════════════════════════════════════════════════════
export const createInviteLink = onCall(
  { region: 'asia-northeast3', secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const role    = req.auth?.token?.role;
    const brandId = role === 'franchisor' ? req.auth?.token?.brand_id : req.data.brandId;
    if (!['admin','franchisor'].includes(role ?? '') || !brandId)
      throw new HttpsError('permission-denied', '권한이 없습니다.');

    // 플랜 한도 확인
    const { data: brand } = await getSupabase()
      .from('carelaw_brands').select('plan, subdomain').eq('id', brandId).single();

    const limits: Record<string, number> = { free: 10, starter: 30, growth: 100, enterprise: 999 };
    const max = limits[brand?.plan ?? 'free'] ?? 10;

    const { count } = await getSupabase()
      .from('carelaw_franchisees').select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId).eq('active', true);

    if ((count ?? 0) >= max)
      throw new HttpsError('resource-exhausted', `현재 플랜 점주 한도(${max}명)에 도달했습니다.`);

    const token     = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await getSupabase().from('carelaw_invites').insert({
      token, brand_id: brandId, created_by: uid, expires_at: expiresAt,
    });

    const url = `https://${brand?.subdomain ?? brandId}.care-law.kr/onboard/${token}`;
    return { url, expiresAt };
  }
);

// ════════════════════════════════════════════════════════
// 3. 초대 토큰 검증 + Custom Claims 설정
// ════════════════════════════════════════════════════════
export const verifyInviteAndSetClaims = onCall(
  { region: 'asia-northeast3', secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const { token } = req.data as { token: string };

    const { data: invite } = await getSupabase()
      .from('carelaw_invites').select('*').eq('token', token).single();

    if (!invite)            throw new HttpsError('not-found',          '유효하지 않은 초대 링크입니다.');
    if (invite.used_at)     throw new HttpsError('already-exists',     '이미 사용된 초대 링크입니다.');
    if (new Date(invite.expires_at) < new Date())
                            throw new HttpsError('deadline-exceeded',  '만료된 초대 링크입니다.');

    const brandId = invite.brand_id;

    // Firebase Custom Claims 설정
    await admin.auth().setCustomUserClaims(uid, {
      role: 'franchisee', brand_id: brandId, active: true,
    });

    // Supabase 점주 레코드 upsert
    await getSupabase().from('carelaw_franchisees').upsert({
      uid, brand_id: brandId, active: true,
      invite_token: token, invited_at: new Date().toISOString(),
    }, { onConflict: 'uid' });

    // 초대 토큰 사용 처리
    await getSupabase().from('carelaw_invites').update({ used_at: new Date().toISOString() }).eq('token', token);

    return { brandId, success: true };
  }
);

// ════════════════════════════════════════════════════════
// 4. 점주 비활성화
// ════════════════════════════════════════════════════════
export const deactivateFranchisee = onCall(
  { region: 'asia-northeast3', secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid    = req.auth?.uid;
    const role   = req.auth?.token?.role;
    const myBrandId = req.auth?.token?.brand_id;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const { franchiseeUid, brandId } = req.data as { franchiseeUid: string; brandId: string };

    if (role !== 'admin' && !(role === 'franchisor' && myBrandId === brandId))
      throw new HttpsError('permission-denied', '권한이 없습니다.');

    await admin.auth().setCustomUserClaims(franchiseeUid, {
      role: 'franchisee', brand_id: brandId, active: false,
    });

    await getSupabase().from('carelaw_franchisees')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('uid', franchiseeUid);

    return { success: true };
  }
);

// ════════════════════════════════════════════════════════
// 5. 점주 활성화
// ════════════════════════════════════════════════════════
export const activateFranchisee = onCall(
  { region: 'asia-northeast3', secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid    = req.auth?.uid;
    const role   = req.auth?.token?.role;
    const myBrandId = req.auth?.token?.brand_id;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const { franchiseeUid, brandId } = req.data as { franchiseeUid: string; brandId: string };

    if (role !== 'admin' && !(role === 'franchisor' && myBrandId === brandId))
      throw new HttpsError('permission-denied', '권한이 없습니다.');

    await admin.auth().setCustomUserClaims(franchiseeUid, {
      role: 'franchisee', brand_id: brandId, active: true,
    });

    await getSupabase().from('carelaw_franchisees')
      .update({ active: true, updated_at: new Date().toISOString() })
      .eq('uid', franchiseeUid);

    return { success: true };
  }
);

// ════════════════════════════════════════════════════════
// 6. 만료 계약 자동 비활성화 (매일 09:00 KST)
// ════════════════════════════════════════════════════════
export const autoDeactivateExpired = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'Asia/Seoul', region: 'asia-northeast3', secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async () => {
    const { data: expired } = await getSupabase()
      .from('carelaw_franchisees')
      .select('uid, brand_id')
      .eq('active', true)
      .lt('contract_expiry', new Date().toISOString())
      .not('contract_expiry', 'is', null);

    if (!expired?.length) return;

    for (const f of expired) {
      await admin.auth().setCustomUserClaims(f.uid, {
        role: 'franchisee', brand_id: f.brand_id, active: false,
      });
    }

    await getSupabase().from('carelaw_franchisees')
      .update({ active: false, updated_at: new Date().toISOString() })
      .in('uid', expired.map((f: any) => f.uid));

    console.log(`[자동 비활성화] ${expired.length}명 처리 완료`);
  }
);

// ════════════════════════════════════════════════════════
// 7. 케이스 생성 시 AI 자동 분류 + 요약
// ════════════════════════════════════════════════════════
export const classifyCase = onCall(
  { region: 'asia-northeast3', secrets: ['CLAUDE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const { caseId, firstMessage } = req.data as { caseId: string; firstMessage: string };

    const { data: caseData } = await getSupabase().from('carelaw_cases').select('user_uid').eq('id', caseId).single();
    if (!caseData || caseData.user_uid !== uid) throw new HttpsError('permission-denied', '권한이 없습니다.');

    const response = await getAnthropic().messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `다음 법률 상담 내용의 분류를 딱 한 단어로만 답하세요 (criminal/civil/franchise/labor/lease/other 중 하나):
"${firstMessage}"`,
      }],
    });

    const raw      = response.content[0].type === 'text' ? response.content[0].text.trim().toLowerCase() : 'other';
    const validTypes = ['criminal','civil','franchise','labor','lease','other'];
    const caseType = validTypes.includes(raw) ? raw : 'other';

    await getSupabase().from('carelaw_cases')
      .update({ type: caseType, updated_at: new Date().toISOString() })
      .eq('id', caseId);

    return { type: caseType };
  }
);

// ════════════════════════════════════════════════════════
// 8. 브랜드 생성 (어드민 전용)
// ════════════════════════════════════════════════════════
export const createBrand = onCall(
  { region: 'asia-northeast3', secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    if (req.auth?.token?.role !== 'admin')
      throw new HttpsError('permission-denied', '어드민만 브랜드를 생성할 수 있습니다.');

    const { name, appName, subdomain, ownerEmail, ownerPassword, plan, primaryColor } = req.data as {
      name: string; appName: string; subdomain: string;
      ownerEmail: string; ownerPassword: string;
      plan?: string; primaryColor?: string;
    };

    if (!name || !appName || !subdomain || !ownerEmail || !ownerPassword)
      throw new HttpsError('invalid-argument', '필수 항목을 모두 입력해주세요.');

    // 서브도메인 중복 확인
    const { data: existing } = await getSupabase()
      .from('carelaw_brands').select('id').eq('subdomain', subdomain).single();
    if (existing) throw new HttpsError('already-exists', '이미 사용 중인 서브도메인입니다.');

    // Firebase Auth 계정 생성 (본사 대표)
    let ownerUser;
    try {
      ownerUser = await admin.auth().createUser({ email: ownerEmail, password: ownerPassword });
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists')
        throw new HttpsError('already-exists', '이미 등록된 이메일입니다.');
      throw new HttpsError('internal', '계정 생성 실패: ' + err.message);
    }

    // 브랜드 INSERT
    const { data: brand, error: brandErr } = await getSupabase().from('carelaw_brands').insert({
      name,
      app_name: appName,
      subdomain,
      owner_email: ownerEmail,
      owner_uid: ownerUser.uid,
      plan: plan ?? 'free',
      primary_color: primaryColor ?? '#1E2D4E',
    }).select().single();

    if (brandErr) {
      await admin.auth().deleteUser(ownerUser.uid);
      throw new HttpsError('internal', '브랜드 생성 실패: ' + brandErr.message);
    }

    // Custom Claims 설정
    await admin.auth().setCustomUserClaims(ownerUser.uid, {
      role: 'franchisor', brand_id: brand.id,
    });

    // 구독 레코드 생성
    await getSupabase().from('carelaw_subscriptions').insert({
      brand_id: brand.id, plan: plan ?? 'free', amount: 0, status: 'active',
    });

    return { brandId: brand.id, ownerUid: ownerUser.uid };
  }
);

// ════════════════════════════════════════════════════════
// 9. 브랜드 수정 (어드민 전용)
// ════════════════════════════════════════════════════════
export const updateBrand = onCall(
  { region: 'asia-northeast3', secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    if (req.auth?.token?.role !== 'admin')
      throw new HttpsError('permission-denied', '어드민만 브랜드를 수정할 수 있습니다.');

    const { brandId, ...updates } = req.data as {
      brandId: string; name?: string; appName?: string; plan?: string;
      primaryColor?: string; active?: boolean;
    };

    if (!brandId) throw new HttpsError('invalid-argument', 'brandId가 필요합니다.');

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.appName !== undefined) updateData.app_name = updates.appName;
    if (updates.plan !== undefined) updateData.plan = updates.plan;
    if (updates.primaryColor !== undefined) updateData.primary_color = updates.primaryColor;
    if (updates.active !== undefined) updateData.active = updates.active;

    const { error } = await getSupabase().from('carelaw_brands')
      .update(updateData).eq('id', brandId);

    if (error) throw new HttpsError('internal', '수정 실패: ' + error.message);

    // 플랜 변경 시 구독도 동기화
    if (updates.plan) {
      await getSupabase().from('carelaw_subscriptions')
        .update({ plan: updates.plan, updated_at: new Date().toISOString() })
        .eq('brand_id', brandId);
    }

    return { success: true };
  }
);

// ════════════════════════════════════════════════════════
// 10. 로고 업로드 (base64 → Supabase Storage)
// ════════════════════════════════════════════════════════
export const uploadLogo = onCall(
  { region: 'asia-northeast3', secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const role = req.auth?.token?.role;
    const brandId = req.auth?.token?.brand_id;
    if (!['admin', 'franchisor'].includes(role ?? '') || !brandId)
      throw new HttpsError('permission-denied', '권한이 없습니다.');

    const { base64, fileName, contentType } = req.data as {
      base64: string; fileName: string; contentType: string;
    };

    if (!base64 || !fileName) throw new HttpsError('invalid-argument', '파일 데이터가 필요합니다.');

    const buffer = Buffer.from(base64, 'base64');
    const path = `brands/${brandId}/logo/${fileName}`;

    const { error } = await getSupabase().storage
      .from('care-law')
      .upload(path, buffer, { contentType, upsert: true });

    if (error) throw new HttpsError('internal', '업로드 실패: ' + error.message);

    const { data } = getSupabase().storage.from('care-law').getPublicUrl(path);
    return { url: data.publicUrl };
  }
);
