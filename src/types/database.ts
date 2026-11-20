export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface SiteFeatures {
  schedule: boolean;
  dashboard: boolean;
  profile: boolean;
  study_history: boolean;
  exams_simulados: boolean;
  essay_redacao: boolean;
  question_bank: boolean;
  community: boolean;
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string;
          admin_email: string | null;
          admin_user_id: string;
          created_at: string;
          details: Json;
          id: string;
          outcome: 'success' | 'error';
          target_label: string | null;
          target_user_id: string | null;
        };
        Insert: {
          action: string;
          admin_email?: string | null;
          admin_user_id: string;
          created_at?: string;
          details?: Json;
          id?: string;
          outcome: 'success' | 'error';
          target_label?: string | null;
          target_user_id?: string | null;
        };
        Update: {
          action?: string;
          admin_email?: string | null;
          admin_user_id?: string;
          created_at?: string;
          details?: Json;
          id?: string;
          outcome?: 'success' | 'error';
          target_label?: string | null;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      admin_config: {
        Row: {
          admin_notes: string;
          id: string;
          log_auth_events: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          admin_notes?: string;
          id?: string;
          log_auth_events?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          admin_notes?: string;
          id?: string;
          log_auth_events?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      auth_events: {
        Row: {
          actor_email: string | null;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          actor_email?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          actor_email?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          onboarding_completed: boolean;
          role: 'student' | 'admin';
          status: 'active' | 'suspended';
          suspended_at: string | null;
          suspended_by: string | null;
          suspended_reason: string | null;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          onboarding_completed?: boolean;
          role?: 'student' | 'admin';
          status?: 'active' | 'suspended';
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspended_reason?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          onboarding_completed?: boolean;
          role?: 'student' | 'admin';
          status?: 'active' | 'suspended';
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspended_reason?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          accent_color: string;
          allow_public_signup: boolean;
          announcement_enabled: boolean;
          announcement_text: string;
          favicon_url: string | null;
          features: Json;
          hero_cta_text: string;
          hero_eyebrow: string;
          hero_subtitle: string;
          hero_title: string;
          id: string;
          institutional_tagline: string;
          logo_url: string | null;
          maintenance_message: string;
          maintenance_mode: boolean;
          primary_color: string;
          show_cta: boolean;
          show_features: boolean;
          show_how_it_works: boolean;
          site_name: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          accent_color?: string;
          allow_public_signup?: boolean;
          announcement_enabled?: boolean;
          announcement_text?: string;
          favicon_url?: string | null;
          features?: Json;
          hero_cta_text?: string;
          hero_eyebrow?: string;
          hero_subtitle?: string;
          hero_title?: string;
          id?: string;
          institutional_tagline?: string;
          logo_url?: string | null;
          maintenance_message?: string;
          maintenance_mode?: boolean;
          primary_color?: string;
          show_cta?: boolean;
          show_features?: boolean;
          show_how_it_works?: boolean;
          site_name?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          accent_color?: string;
          allow_public_signup?: boolean;
          announcement_enabled?: boolean;
          announcement_text?: string;
          favicon_url?: string | null;
          features?: Json;
          hero_cta_text?: string;
          hero_eyebrow?: string;
          hero_subtitle?: string;
          hero_title?: string;
          id?: string;
          institutional_tagline?: string;
          logo_url?: string | null;
          maintenance_message?: string;
          maintenance_mode?: boolean;
          primary_color?: string;
          show_cta?: boolean;
          show_features?: boolean;
          show_how_it_works?: boolean;
          site_name?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      study_activities: {
        Row: {
          activity_type: string;
          created_at: string;
          day_index: number;
          done: boolean;
          done_at: string | null;
          id: string;
          minutes: number;
          plan_id: string;
          position: number;
          subject_id: string;
          topic: string;
          topic_index: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          created_at?: string;
          day_index: number;
          done?: boolean;
          done_at?: string | null;
          id?: string;
          minutes: number;
          plan_id: string;
          position?: number;
          subject_id: string;
          topic: string;
          topic_index?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          created_at?: string;
          day_index?: number;
          done?: boolean;
          done_at?: string | null;
          id?: string;
          minutes?: number;
          plan_id?: string;
          position?: number;
          subject_id?: string;
          topic?: string;
          topic_index?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'study_activities_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'study_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      study_logs: {
        Row: {
          completed_count: number;
          completed_minutes: number;
          created_at: string;
          study_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_count?: number;
          completed_minutes?: number;
          created_at?: string;
          study_date: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_count?: number;
          completed_minutes?: number;
          created_at?: string;
          study_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      study_plans: {
        Row: {
          block_minutes: number;
          created_at: string;
          id: string;
          study_days: number[];
          updated_at: string;
          user_id: string;
          week_start: string;
        };
        Insert: {
          block_minutes: number;
          created_at?: string;
          id?: string;
          study_days: number[];
          updated_at?: string;
          user_id: string;
          week_start: string;
        };
        Update: {
          block_minutes?: number;
          created_at?: string;
          id?: string;
          study_days?: number[];
          updated_at?: string;
          user_id?: string;
          week_start?: string;
        };
        Relationships: [];
      };
      study_preferences: {
        Row: {
          created_at: string;
          daily_minutes: number;
          days_per_week: number;
          difficulties: string[];
          goal: string;
          level: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          daily_minutes: number;
          days_per_week: number;
          difficulties?: string[];
          goal: string;
          level: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          daily_minutes?: number;
          days_per_week?: number;
          difficulties?: string[];
          goal?: string;
          level?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      study_progress: {
        Row: {
          coverage: Json;
          created_at: string;
          topic_cursor: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          coverage?: Json;
          created_at?: string;
          topic_cursor?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          coverage?: Json;
          created_at?: string;
          topic_cursor?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_list_active_sessions: {
        Args: never;
        Returns: {
          aal: string;
          created_at: string;
          id: string;
          ip: string;
          not_after: string;
          refreshed_at: string;
          updated_at: string;
          user_agent: string;
          user_id: string;
        }[];
      };
      admin_revoke_session: {
        Args: { target_session_id: string };
        Returns: string;
      };
      admin_revoke_user_sessions: {
        Args: { target_user_id: string };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];
export type AdminConfigRow = Database['public']['Tables']['admin_config']['Row'];
export type AuthEventRow = Database['public']['Tables']['auth_events']['Row'];
export type AdminAuditLogRow = Database['public']['Tables']['admin_audit_logs']['Row'];
export type StudyPreferencesRow = Database['public']['Tables']['study_preferences']['Row'];
export type StudyPlanRow = Database['public']['Tables']['study_plans']['Row'];
export type StudyActivityRow = Database['public']['Tables']['study_activities']['Row'];
export type StudyLogRow = Database['public']['Tables']['study_logs']['Row'];
export type StudyProgressRow = Database['public']['Tables']['study_progress']['Row'];
