// ================================================================
// @care-law/shared — Supabase 클라이언트 + Firebase Auth + 공통 타입
// ================================================================

// ── Firebase Auth (인증만 사용) ──────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

export const auth      = getAuth(firebaseApp);
export const functions = getFunctions(firebaseApp, 'asia-northeast3');

// ── Supabase 클라이언트 (DB + Storage) ───────────────────────
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// ================================================================
// 공통 타입
// ================================================================

export type Plan         = 'free' | 'starter' | 'growth' | 'enterprise';
export type CaseType     = 'criminal' | 'civil' | 'franchise' | 'labor' | 'lease' | 'other';
export type CaseStatus   = 'open' | 'consulting' | 'retained' | 'closed';
export type MessageRole  = 'user' | 'assistant';
export type UserRole     = 'admin' | 'franchisor' | 'franchisee';

export interface Brand {
  id:           string;
  name:         string;
  app_name:     string;
  subdomain:    string;
  logo_url:     string | null;
  primary_color: string;
  plan:         Plan;
  active:       boolean;
  owner_email:  string;
  owner_uid:    string;
  plan_expiry:  string | null;
  created_at:   string;
  updated_at:   string;
}

export interface Franchisee {
  id:               string;
  uid:              string;       // Firebase Auth UID
  brand_id:         string;
  name:             string | null;
  phone:            string | null;
  store_name:       string | null;
  store_address:    string | null;
  contract_expiry:  string | null;
  active:           boolean;
  invite_token:     string | null;
  invited_at:       string | null;
  created_at:       string;
  updated_at:       string;
}

export interface Case {
  id:          string;
  user_uid:    string;
  brand_id:    string;
  type:        CaseType;
  status:      CaseStatus;
  title:       string;
  summary:     string | null;
  attachments: string[];
  retained_at: string | null;
  closed_at:   string | null;
  created_at:  string;
  updated_at:  string;
}

export interface Message {
  id:         string;
  case_id:    string;
  role:       MessageRole;
  content:    string;
  created_at: string;
}

export interface Invite {
  token:      string;
  brand_id:   string;
  created_by: string;
  used_at:    string | null;
  expires_at: string;
  created_at: string;
}

export interface Notification {
  id:         string;
  target_uid: string;
  title:      string;
  body:       string;
  type:       string;
  data:       Record<string, string> | null;
  read:       boolean;
  read_at:    string | null;
  created_at: string;
}

export interface CustomClaims {
  role:     UserRole;
  brand_id?: string;
  active?:  boolean;
}

export interface Subscription {
  id:           string;
  brand_id:     string;
  plan:         Plan;
  amount:       number;
  status:       string;
  next_billing: string | null;
  memo:         string | null;
  created_at:   string;
  updated_at:   string;
}

// ================================================================
// 플랜 상수
// ================================================================
export const PLAN_LIMITS: Record<Plan, { maxFranchisees: number; price: number }> = {
  free:       { maxFranchisees: 10,  price: 0       },
  starter:    { maxFranchisees: 30,  price: 99000   },
  growth:     { maxFranchisees: 100, price: 249000  },
  enterprise: { maxFranchisees: 999, price: 490000  },
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'FREE', starter: '스타터', growth: '그로스', enterprise: '엔터프라이즈',
};

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  criminal: '형사 사건', civil: '민사 사건', franchise: '가맹 분쟁',
  labor: '노무·임금', lease: '임대차 분쟁', other: '기타',
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  open: '상담 중', consulting: '변호사 검토', retained: '수임 진행', closed: '종결',
};
