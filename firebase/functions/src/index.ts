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

const LEGAL_SYSTEM_PROMPT = `당신은 법률사무소 청송의 20년차 베테랑 사무장입니다.
이름은 "케어로 사무장"입니다. 민사·형사·가사·행정 등 모든 법률 영역의 사건을 다룹니다.

[당신의 역할]
- 의뢰인의 이야기를 경청하고, 감정적으로 공감하며 위로합니다
- 법적으로 의미 있는 사실관계를 자연스럽게 파악합니다
- 의뢰인이 원하는 방향과 목표를 정리합니다
- 충분한 사실관계가 모이면, 변호사에게 보고할 정리된 페이퍼를 작성합니다

[대화 스타일]
- 항상 한국어, 따뜻하고 친절한 톤
- "~하셨군요", "많이 힘드셨겠습니다", "걱정되시죠" 등 공감 표현 적극 사용
- 비전문가도 이해할 수 있는 쉬운 용어
- 한 번에 너무 많은 질문을 하지 말고, 대화하듯 자연스럽게 하나씩 여쭤보기
- 어떤 법률 분야든 거절하지 않고 이야기를 들어줍니다

[절대 금지]
- 직접적인 법률 상담이나 결론적 법률 의견 제시 금지 ("~해야 합니다", "~할 수 있습니다" 같은 단정 금지)
- 나홀로 소송, AI 소송, 자가 대응 등을 권유하거나 추천하지 않습니다
- "제 역할 범위를 벗어납니다", "전문 상담은 제 역할이 아닙니다" 같은 거절 금지

[사실관계 파악 단계]
1. 의뢰인의 상황을 충분히 듣습니다 (무슨 일이 있었는지, 상대방은 누구인지, 시기, 증거 등)
2. 감정적으로 공감하면서 추가 사실을 자연스럽게 확인합니다
3. 의뢰인이 원하는 결과(목표)를 파악합니다

[사실관계 충분히 모였을 때]
아래 형식으로 정리된 페이퍼를 제시합니다:

---
📋 **사건 요약 보고서**

**의뢰인 상황**: (정리된 사실관계)
**상대방**: (관련 당사자)
**핵심 쟁점**: (법적으로 의미있는 포인트)
**의뢰인 희망**: (원하는 결과)
**관련 증거**: (있는 경우)

**변호사 검토 옵션**:
1️⃣ [옵션 A] - (간단 설명)
2️⃣ [옵션 B] - (간단 설명)
3️⃣ [옵션 C] - (간단 설명)

→ 변호사님께서 검토 후 최선의 방향을 안내해 드리겠습니다.
---

[면책고지 - 첫 대화에서 1회만]
※ 저는 사무장으로서 사실관계를 정리해 드리며, 최종 법률 판단은 담당 변호사님께서 해주십니다.`;

// ════════════════════════════════════════════════════════
// 1. AI 법률 상담
// ════════════════════════════════════════════════════════
export const chatWithAI = onCall(
  { region: 'asia-northeast3', cors: true, secrets: ['CLAUDE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
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
  { region: 'asia-northeast3', cors: true, secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const role    = req.auth?.token?.user_role ?? req.auth?.token?.role;
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

    // 도메인 구매 전까지 Firebase Hosting URL 사용
    const url = `https://care-law-franchisee.web.app/onboard/${token}`;
    return { url, expiresAt };
  }
);

// ════════════════════════════════════════════════════════
// 3. 초대 토큰 검증 + Custom Claims 설정
// ════════════════════════════════════════════════════════
export const verifyInviteAndSetClaims = onCall(
  { region: 'asia-northeast3', cors: true, secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
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
      role: 'authenticated', user_role: 'franchisee', brand_id: brandId, active: true,
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
  { region: 'asia-northeast3', cors: true, secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid    = req.auth?.uid;
    const role   = req.auth?.token?.user_role ?? req.auth?.token?.role;
    const myBrandId = req.auth?.token?.brand_id;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const { franchiseeUid, brandId } = req.data as { franchiseeUid: string; brandId: string };

    if (role !== 'admin' && !(role === 'franchisor' && myBrandId === brandId))
      throw new HttpsError('permission-denied', '권한이 없습니다.');

    await admin.auth().setCustomUserClaims(franchiseeUid, {
      role: 'authenticated', user_role: 'franchisee', brand_id: brandId, active: false,
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
  { region: 'asia-northeast3', cors: true, secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid    = req.auth?.uid;
    const role   = req.auth?.token?.user_role ?? req.auth?.token?.role;
    const myBrandId = req.auth?.token?.brand_id;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const { franchiseeUid, brandId } = req.data as { franchiseeUid: string; brandId: string };

    if (role !== 'admin' && !(role === 'franchisor' && myBrandId === brandId))
      throw new HttpsError('permission-denied', '권한이 없습니다.');

    await admin.auth().setCustomUserClaims(franchiseeUid, {
      role: 'authenticated', user_role: 'franchisee', brand_id: brandId, active: true,
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
        role: 'authenticated', user_role: 'franchisee', brand_id: f.brand_id, active: false,
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
  { region: 'asia-northeast3', cors: true, secrets: ['CLAUDE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
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
  { region: 'asia-northeast3', cors: true, secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    if ((req.auth?.token?.user_role ?? req.auth?.token?.role) !== 'admin')
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
      role: 'authenticated', user_role: 'franchisor', brand_id: brand.id, active: true,
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
  { region: 'asia-northeast3', cors: true, secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    if ((req.auth?.token?.user_role ?? req.auth?.token?.role) !== 'admin')
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
  { region: 'asia-northeast3', cors: true, secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const role = req.auth?.token?.user_role ?? req.auth?.token?.role;
    const brandId = req.auth?.token?.brand_id;
    if (!['admin', 'franchisor'].includes(role ?? '') || !brandId)
      throw new HttpsError('permission-denied', '권한이 없습니다.');

    const { base64, fileName, contentType } = req.data as {
      base64: string; fileName: string; contentType: string;
    };

    if (!base64 || !fileName) throw new HttpsError('invalid-argument', '파일 데이터가 필요합니다.');

    const buffer = Buffer.from(base64, 'base64');
    const ext = fileName.split('.').pop() ?? 'png';
    const safeName = `logo_${Date.now()}.${ext}`;
    const path = `brands/${brandId}/logo/${safeName}`;

    const { error } = await getSupabase().storage
      .from('care-law')
      .upload(path, buffer, { contentType, upsert: true });

    if (error) throw new HttpsError('internal', '업로드 실패: ' + error.message);

    const { data } = getSupabase().storage.from('care-law').getPublicUrl(path);
    return { url: data.publicUrl };
  }
);

// ════════════════════════════════════════════════════════
// 11. 문서 업로드 (base64 → Supabase Storage)
// ════════════════════════════════════════════════════════
export const uploadDocument = onCall(
  { region: 'asia-northeast3', cors: true, secrets: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    if (!req.auth?.token?.active) throw new HttpsError('permission-denied', '이용 권한이 없습니다.');

    const brandId = req.auth?.token?.brand_id;
    const { base64, fileName, contentType, caseId } = req.data as {
      base64: string; fileName: string; contentType: string; caseId?: string;
    };

    if (!base64 || !fileName) throw new HttpsError('invalid-argument', '파일 데이터가 필요합니다.');

    const buffer = Buffer.from(base64, 'base64');
    const ext = fileName.split('.').pop() ?? 'pdf';
    const safeName = `doc_${Date.now()}.${ext}`;
    const path = `documents/${brandId}/${uid}/${safeName}`;

    const { error } = await getSupabase().storage
      .from('care-law')
      .upload(path, buffer, { contentType, upsert: true });

    if (error) throw new HttpsError('internal', '업로드 실패: ' + error.message);

    const { data } = getSupabase().storage.from('care-law').getPublicUrl(path);
    const url = data.publicUrl;

    // 케이스에 첨부파일 추가
    if (caseId) {
      const { data: caseData } = await getSupabase()
        .from('carelaw_cases').select('attachments').eq('id', caseId).single();
      const attachments = [...(caseData?.attachments ?? []), url];
      await getSupabase().from('carelaw_cases')
        .update({ attachments, updated_at: new Date().toISOString() })
        .eq('id', caseId);
    }

    return { url, fileName: safeName };
  }
);

// ════════════════════════════════════════════════════════
// 12. 첨부파일 분석 (이미지 OCR + 문서 요약 via Claude Vision)
// ════════════════════════════════════════════════════════
export const analyzeAttachment = onCall(
  { region: 'asia-northeast3', cors: true, secrets: ['CLAUDE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    if (!req.auth?.token?.active) throw new HttpsError('permission-denied', '이용 권한이 없습니다.');

    const { caseId, base64, fileName, contentType, userMessage } = req.data as {
      caseId: string; base64: string; fileName: string; contentType: string; userMessage?: string;
    };

    if (!caseId || !base64) throw new HttpsError('invalid-argument', '필수 데이터가 없습니다.');

    const { data: caseData } = await getSupabase().from('carelaw_cases').select('user_uid, brand_id').eq('id', caseId).single();
    if (!caseData || caseData.user_uid !== uid) throw new HttpsError('permission-denied', '권한이 없습니다.');

    // 1) Supabase Storage에 파일 업로드
    const buffer = Buffer.from(base64, 'base64');
    const ext = fileName.split('.').pop() ?? 'jpg';
    const safeName = `attach_${Date.now()}.${ext}`;
    const path = `attachments/${caseData.brand_id}/${uid}/${safeName}`;

    const { error: uploadErr } = await getSupabase().storage.from('care-law').upload(path, buffer, { contentType, upsert: true });
    if (uploadErr) console.error('Storage upload error:', uploadErr);
    const { data: urlData } = getSupabase().storage.from('care-law').getPublicUrl(path);
    const fileUrl = urlData.publicUrl;

    // 케이스 첨부파일 목록에 추가
    const { data: existingCase } = await getSupabase().from('carelaw_cases').select('attachments').eq('id', caseId).single();
    await getSupabase().from('carelaw_cases')
      .update({ attachments: [...(existingCase?.attachments ?? []), fileUrl], updated_at: new Date().toISOString() })
      .eq('id', caseId);

    // 2) 사용자 메시지 저장 (첨부파일 포함)
    const userText = userMessage
      ? `📎 [첨부파일: ${fileName}]\n${userMessage}`
      : `📎 [첨부파일: ${fileName}]`;
    await getSupabase().from('carelaw_messages').insert({ case_id: caseId, role: 'user', content: userText });

    // 3) Claude Vision으로 분석
    const isImage = contentType.startsWith('image/');
    const messages: any[] = [];

    // 이전 대화 컨텍스트 (최근 10개)
    const { data: history } = await getSupabase()
      .from('carelaw_messages').select('role, content')
      .eq('case_id', caseId).order('created_at', { ascending: true }).limit(10);

    if (history) {
      messages.push(...history.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    }

    const isPdf = contentType === 'application/pdf';
    const analysisPrompt = `의뢰인이 첨부한 파일입니다. 파일명: ${fileName}
${userMessage ? `의뢰인 메모: ${userMessage}` : ''}

다음을 수행해주세요:
1. 파일의 내용을 꼼꼼히 읽고 핵심 내용을 정리합니다
2. 법적으로 의미있는 내용(날짜, 금액, 당사자, 조항 등)을 파악합니다
3. 의뢰인에게 확인이 필요한 사항을 물어봅니다

사무장 역할에 맞게 따뜻하고 친절하게 응대해주세요.`;

    if (isImage) {
      messages.push({
        role: 'user' as const,
        content: [
          { type: 'image' as const, source: { type: 'base64' as const, media_type: contentType, data: base64 } },
          { type: 'text' as const, text: analysisPrompt },
        ],
      });
    } else if (isPdf) {
      messages.push({
        role: 'user' as const,
        content: [
          { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } },
          { type: 'text' as const, text: analysisPrompt },
        ],
      });
    } else {
      messages.push({
        role: 'user' as const,
        content: `의뢰인이 파일을 첨부했습니다. 파일명: ${fileName} (${contentType})
${userMessage ? `의뢰인 메모: ${userMessage}` : ''}

파일이 접수되었음을 안내하고, 변호사가 검토할 예정임을 알려주세요.`,
      });
    }

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: LEGAL_SYSTEM_PROMPT,
      messages,
    });

    const aiText = response.content[0].type === 'text' ? response.content[0].text : '';

    // AI 응답 저장
    await getSupabase().from('carelaw_messages').insert({ case_id: caseId, role: 'assistant', content: aiText });
    await getSupabase().from('carelaw_cases').update({ status: 'consulting', updated_at: new Date().toISOString() }).eq('id', caseId);

    return { message: aiText, fileUrl };
  }
);
