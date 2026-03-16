import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged, User,
} from 'firebase/auth';
import { auth, supabase } from '@care-law/shared';
import type { CustomClaims, Brand } from '@care-law/shared';

interface FranchisorAuthState {
  user:    User | null;
  claims:  CustomClaims | null;
  brand:   Brand | null;
  loading: boolean;
  login:   (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  init:    () => () => void;
}

export const useAuthStore = create<FranchisorAuthState>((set) => ({
  user:    null,
  claims:  null,
  brand:   null,
  loading: true,

  login: async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  },

  signOut: async () => {
    await fbSignOut(auth);
    set({ user: null, claims: null, brand: null });
  },

  init: () => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { set({ user: null, claims: null, brand: null, loading: false }); return; }

      const result = await user.getIdTokenResult();
      const claims = result.claims as unknown as CustomClaims;

      // 본사 브랜드 정보 로드
      let brand: Brand | null = null;
      if (claims.brand_id) {
        const { data } = await supabase
          .from('carelaw_brands').select('*').eq('id', claims.brand_id).single();
        brand = data;
      }

      set({ user, claims, brand, loading: false });
    });
    return unsub;
  },
}));
