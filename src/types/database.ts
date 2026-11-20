export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          onboarding_completed: boolean;
          role: 'student' | 'admin';
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
          updated_at?: string;
          username?: string | null;
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
      [_ in never]: never;
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
export type StudyPreferencesRow = Database['public']['Tables']['study_preferences']['Row'];
export type StudyPlanRow = Database['public']['Tables']['study_plans']['Row'];
export type StudyActivityRow = Database['public']['Tables']['study_activities']['Row'];
export type StudyLogRow = Database['public']['Tables']['study_logs']['Row'];
export type StudyProgressRow = Database['public']['Tables']['study_progress']['Row'];
