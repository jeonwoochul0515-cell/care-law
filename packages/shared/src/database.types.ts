// ================================================================
// Supabase 자동 생성 타입
// 실제 사용 시: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > database.types.ts
// 아래는 수동 작성 버전 (supabase-js v2.99+ 호환)
// ================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      carelaw_brands: {
        Row: {
          id:            string;
          name:          string;
          app_name:      string;
          subdomain:     string;
          logo_url:      string | null;
          primary_color: string;
          plan:          'free' | 'starter' | 'growth' | 'enterprise';
          active:        boolean;
          owner_email:   string;
          owner_uid:     string;
          plan_expiry:   string | null;
          created_at:    string;
          updated_at:    string;
        };
        Insert: {
          id?:           string;
          name:          string;
          app_name:      string;
          subdomain:     string;
          logo_url?:     string | null;
          primary_color?: string;
          plan?:         'free' | 'starter' | 'growth' | 'enterprise';
          active?:       boolean;
          owner_email:   string;
          owner_uid:     string;
          plan_expiry?:  string | null;
        };
        Update: {
          id?:           string;
          name?:         string;
          app_name?:     string;
          subdomain?:    string;
          logo_url?:     string | null;
          primary_color?: string;
          plan?:         'free' | 'starter' | 'growth' | 'enterprise';
          active?:       boolean;
          owner_email?:  string;
          owner_uid?:    string;
          plan_expiry?:  string | null;
        };
        Relationships: [];
      };
      carelaw_franchisees: {
        Row: {
          id:              string;
          uid:             string;
          brand_id:        string;
          name:            string | null;
          phone:           string | null;
          store_name:      string | null;
          store_address:   string | null;
          contract_expiry: string | null;
          active:          boolean;
          invite_token:    string | null;
          invited_at:      string | null;
          created_at:      string;
          updated_at:      string;
        };
        Insert: {
          id?:             string;
          uid:             string;
          brand_id:        string;
          name?:           string | null;
          phone?:          string | null;
          store_name?:     string | null;
          store_address?:  string | null;
          contract_expiry?: string | null;
          active?:         boolean;
          invite_token?:   string | null;
          invited_at?:     string | null;
        };
        Update: {
          id?:             string;
          uid?:            string;
          brand_id?:       string;
          name?:           string | null;
          phone?:          string | null;
          store_name?:     string | null;
          store_address?:  string | null;
          contract_expiry?: string | null;
          active?:         boolean;
          invite_token?:   string | null;
          invited_at?:     string | null;
        };
        Relationships: [
          {
            foreignKeyName: "franchisees_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "carelaw_brands";
            referencedColumns: ["id"];
          }
        ];
      };
      carelaw_invites: {
        Row: {
          token:      string;
          brand_id:   string;
          created_by: string;
          used_at:    string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          token:      string;
          brand_id:   string;
          created_by: string;
          used_at?:   string | null;
          expires_at: string;
        };
        Update: {
          token?:      string;
          brand_id?:   string;
          created_by?: string;
          used_at?:    string | null;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invites_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "carelaw_brands";
            referencedColumns: ["id"];
          }
        ];
      };
      carelaw_cases: {
        Row: {
          id:          string;
          user_uid:    string;
          brand_id:    string;
          type:        'criminal' | 'civil' | 'franchise' | 'labor' | 'lease' | 'other';
          status:      'open' | 'consulting' | 'retained' | 'closed';
          title:       string;
          summary:     string | null;
          attachments: string[];
          retained_at: string | null;
          closed_at:   string | null;
          created_at:  string;
          updated_at:  string;
        };
        Insert: {
          id?:         string;
          user_uid:    string;
          brand_id:    string;
          type?:       'criminal' | 'civil' | 'franchise' | 'labor' | 'lease' | 'other';
          status?:     'open' | 'consulting' | 'retained' | 'closed';
          title?:      string;
          summary?:    string | null;
          attachments?: string[];
          retained_at?: string | null;
          closed_at?:  string | null;
        };
        Update: {
          id?:         string;
          user_uid?:   string;
          brand_id?:   string;
          type?:       'criminal' | 'civil' | 'franchise' | 'labor' | 'lease' | 'other';
          status?:     'open' | 'consulting' | 'retained' | 'closed';
          title?:      string;
          summary?:    string | null;
          attachments?: string[];
          retained_at?: string | null;
          closed_at?:  string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cases_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "carelaw_brands";
            referencedColumns: ["id"];
          }
        ];
      };
      carelaw_messages: {
        Row: {
          id:         string;
          case_id:    string;
          role:       'user' | 'assistant';
          content:    string;
          created_at: string;
        };
        Insert: {
          id?:      string;
          case_id:  string;
          role:     'user' | 'assistant';
          content:  string;
        };
        Update: {
          id?:      string;
          case_id?: string;
          role?:    'user' | 'assistant';
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "carelaw_cases";
            referencedColumns: ["id"];
          }
        ];
      };
      carelaw_notifications: {
        Row: {
          id:         string;
          target_uid: string;
          title:      string;
          body:       string;
          type:       string;
          data:       Json | null;
          read:       boolean;
          read_at:    string | null;
          created_at: string;
        };
        Insert: {
          id?:        string;
          target_uid: string;
          title:      string;
          body:       string;
          type:       string;
          data?:      Json | null;
          read?:      boolean;
          read_at?:   string | null;
        };
        Update: {
          id?:        string;
          target_uid?: string;
          title?:     string;
          body?:      string;
          type?:      string;
          data?:      Json | null;
          read?:      boolean;
          read_at?:   string | null;
        };
        Relationships: [];
      };
      carelaw_subscriptions: {
        Row: {
          id:           string;
          brand_id:     string;
          plan:         'free' | 'starter' | 'growth' | 'enterprise';
          amount:       number;
          status:       string;
          next_billing: string | null;
          memo:         string | null;
          created_at:   string;
          updated_at:   string;
        };
        Insert: {
          id?:          string;
          brand_id:     string;
          plan?:        'free' | 'starter' | 'growth' | 'enterprise';
          amount?:      number;
          status?:      string;
          next_billing?: string | null;
          memo?:        string | null;
        };
        Update: {
          id?:          string;
          brand_id?:    string;
          plan?:        'free' | 'starter' | 'growth' | 'enterprise';
          amount?:      number;
          status?:      string;
          next_billing?: string | null;
          memo?:        string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: true;
            referencedRelation: "carelaw_brands";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      carelaw_plan_limits: {
        Row: {
          plan:              string | null;
          max_franchisees:   number | null;
          price_krw:         number | null;
        };
        Relationships: [];
      };
    };
    Functions: {};
    Enums: {
      plan_type:    'free' | 'starter' | 'growth' | 'enterprise';
      case_type:    'criminal' | 'civil' | 'franchise' | 'labor' | 'lease' | 'other';
      case_status:  'open' | 'consulting' | 'retained' | 'closed';
      message_role: 'user' | 'assistant';
      user_role:    'admin' | 'franchisor' | 'franchisee';
    };
  };
}
