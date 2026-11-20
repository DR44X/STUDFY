import type { AdminAuditLogRow, AdminConfigRow, AuthEventRow, SiteSettingsRow, StudyActivityRow, StudyLogRow, StudyPlanRow, StudyPreferencesRow } from '../types/database';
import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: 'admin' | 'student';
  status: 'active' | 'suspended';
  onboarding_completed: boolean;
  email_confirmed: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  plans_count: number;
  activities_total: number;
  activities_done: number;
  study_minutes_total: number;
}

export interface AdminActiveSession {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  refreshed_at: string | null;
  not_after: string | null;
  user_agent: string | null;
  ip: string | null;
  aal: string | null;
}

export interface AdminAuthEvent extends AuthEventRow {
  full_name: string | null;
}

export interface AdminOverviewResponse {
  kpis: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    newSignups7d: number;
    newSignups30d: number;
    recentLogins24h: number;
    activeSessionsCount: number;
    totalPlansCount: number;
    totalActivitiesCount: number;
    completedActivitiesCount: number;
    completedMinutesTotal: number;
    onboardingCompletedCount: number;
  };
  featureUsage: { label: string; count: number; total: number }[];
  series: {
    date: string;
    signups: number;
    completedActivities: number;
    completedMinutes: number;
    logins: number;
  }[];
}

export interface AdminUserDetailResponse {
  user: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    banned_until: string | null;
    role: 'admin' | 'student';
    status: 'active' | 'suspended';
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    onboarding_completed: boolean;
    suspended_at: string | null;
    suspended_reason: string | null;
  };
  preferences: StudyPreferencesRow | null;
  progress: { topic_cursor: Record<string, number>; coverage: Record<string, number> } | null;
  plans: StudyPlanRow[];
  activities: StudyActivityRow[];
  studyLogs: StudyLogRow[];
  activeSessions: AdminActiveSession[];
  authEvents: AuthEventRow[];
}

export interface AdminDatabaseOverviewResponse {
  tables: { table: string; rows: number }[];
  selectedTable: string;
  rows: Record<string, unknown>[];
}

export async function callAdminApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Sessão administrativa expirada. Entre novamente.');
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = (await res.json().catch(() => null)) as { error?: string } & T | null;
  if (!res.ok) {
    throw new Error(data?.error || 'Não foi possível completar a operação administrativa.');
  }

  return data as T;
}

export async function logAuthEvent(params: {
  event_type: 'login_success' | 'login_failed' | 'logout' | 'signup' | 'password_reset_request' | 'password_updated';
  email?: string;
  reason?: string;
  accessToken?: string;
}): Promise<void> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
    };
    if (params.accessToken) {
      headers.Authorization = `Bearer ${params.accessToken}`;
    }
    await fetch(`${SUPABASE_URL}/functions/v1/auth-event-logger`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: params.event_type,
        email: params.email,
        reason: params.reason,
      }),
    });
  } catch {
    // Registro de evento não deve bloquear o fluxo de autenticação do usuário.
  }
}

const ALLOWED_BRANDING_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

export async function uploadBrandingAsset(kind: 'logo' | 'favicon', file: File): Promise<string> {
  if (!ALLOWED_BRANDING_TYPES.has(file.type)) {
    throw new Error('Formato inválido. Use PNG, JPG, WebP, SVG ou ICO.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('O arquivo deve ter no máximo 2 MB.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const filePath = `${kind}.${ext}`;

  const { error } = await supabase.storage.from('branding').upload(filePath, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  });

  if (error) {
    throw new Error('Não foi possível enviar o arquivo para o armazenamento.');
  }

  const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export type { AdminAuditLogRow, AdminConfigRow, SiteSettingsRow };
