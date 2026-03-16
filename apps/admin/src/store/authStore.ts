import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged, User,
} from 'firebase/auth';
import { auth } from '@care-law/shared';
import type { CustomClaims } from '@care-law/shared';

interface AdminAuthState {
  user:    User | null;
  claims:  CustomClaims | null;
  loading: boolean;
  login:   (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  init:    () => () => void;
}

export const useAuthStore = create<AdminAuthState>((set) => ({
  user:    null,
  claims:  null,
  loading: true,

  login: async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  },

  signOut: async () => {
    await fbSignOut(auth);
    set({ user: null, claims: null });
  },

  init: () => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { set({ user: null, claims: null, loading: false }); return; }

      const result = await user.getIdTokenResult();
      const claims = result.claims as unknown as CustomClaims;

      set({ user, claims, loading: false });
    });
    return unsub;
  },
}));
