import { create } from 'zustand';
import { supabase } from '@care-law/shared';
import type { Brand } from '@care-law/shared';

// RLS 컬럼권한(비-PII)에 맞춘 공개 컬럼만 조회 (select * 금지)
const BRAND_COLS = 'id, subdomain, name, app_name, logo_url, primary_color, active';

function getSubdomain(): string {
  // ?brand= 쿼리 파라미터가 있으면 항상 우선 사용
  const brandParam = new URLSearchParams(window.location.search).get('brand');
  if (brandParam) return brandParam;

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'dev';

  // Firebase Hosting URL (care-law-franchisee.web.app) → 공통 앱이므로 brand 파라미터 필요
  if (host.endsWith('.web.app') || host.endsWith('.firebaseapp.com')) return 'default';

  // 프로덕션: subdomain.care-law.kr → subdomain 추출
  const parts = host.split('.');
  return parts.length >= 3 ? parts[0] : 'default';
}

interface BrandState {
  brand:     Brand | null;
  loading:   boolean;
  error:     string | null;
  loadBrand: () => Promise<void>;
}

export const useBrandStore = create<BrandState>((set) => ({
  brand:   null,
  loading: true,
  error:   null,

  loadBrand: async () => {
    const subdomain = getSubdomain();
    set({ loading: true, error: null });
    try {
      let data, error;

      if (subdomain === 'default' || subdomain === 'dev') {
        // 기본/개발 환경: 첫 번째 활성 브랜드 로드
        const res = await supabase
          .from('carelaw_brands')
          .select(BRAND_COLS)
          .eq('active', true)
          .order('subdomain', { ascending: true })   // anon 권한 컬럼으로 정렬(created_at 미허용 → 401 회피)
          .limit(1)
          .single();
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase
          .from('carelaw_brands')
          .select(BRAND_COLS)
          .eq('subdomain', subdomain)
          .eq('active', true)
          .single();
        data = res.data;
        error = res.error;
      }

      if (error || !data) {
        set({ error: '브랜드를 찾을 수 없습니다.', loading: false });
        return;
      }
      set({ brand: data as Brand, loading: false });
    } catch {
      set({ error: '브랜드 로드 실패', loading: false });
    }
  },
}));
