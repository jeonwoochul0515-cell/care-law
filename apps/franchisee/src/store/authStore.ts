import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged, User,
} from 'firebase/auth';
import { auth, supabase } from '@care-law/shared';
import type { CustomClaims, Franchisee } from '@care-law/shared';

interface AuthState {
  user:        User | null;
  claims:      CustomClaims | null;
  franchisee:  Franchisee | null;
  loading:     boolean;
  login:       (email: string, password: string) => Promise<void>;
  register:    (email: string, password: string) => Promise<void>;
  signOut:     () => Promise<void>;
  initAuthListener:  () => () => void;
  refreshClaims:     () => Promise<void>;
  refreshFranchisee: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:        null,
  claims:      null,
  franchisee:  null,
  loading:     true,

  login: async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  },

  register: async (email, password) => {
    await createUserWithEmailAndPassword(auth, email, password);
  },

  signOut: async () => {
    await fbSignOut(auth);
    set({ user: null, claims: null, franchisee: null });
  },

  refreshClaims: async () => {
    const { user } = get();
    if (!user) return;
    const tokenResult = await user.getIdTokenResult(true);
    const claims = tokenResult.claims as unknown as CustomClaims;
    set({ claims });

    if ((claims.user_role ?? claims.role) === 'franchisee') {
      const { data } = await supabase
        .from('carelaw_franchisees')
        .select('*')
        .eq('uid', user.uid)
        .single();
      set({ franchisee: data });
    }
  },

  refreshFranchisee: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase
      .from('carelaw_franchisees')
      .select('*')
      .eq('uid', user.uid)
      .single();
    set({ franchisee: data });
  },

  initAuthListener: () => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        set({ user: null, claims: null, franchisee: null, loading: false });
        return;
      }
      const tokenResult = await user.getIdTokenResult();
      const claims = tokenResult.claims as unknown as CustomClaims;

      let franchisee: Franchisee | null = null;
      if ((claims.user_role ?? claims.role) === 'franchisee') {
        const { data } = await supabase
          .from('carelaw_franchisees')
          .select('*')
          .eq('uid', user.uid)
          .single();
        franchisee = data;
      }

      set({ user, claims, franchisee, loading: false });
    });
    return unsub;
  },
}));
