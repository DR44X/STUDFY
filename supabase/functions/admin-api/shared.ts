import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isUserSuspended(authUser: { banned_until?: string | null }, profileStatus?: string | null): boolean {
  if (profileStatus === "suspended") return true;
  if (!authUser.banned_until) return false;
  const ms = Date.parse(authUser.banned_until);
  return Number.isFinite(ms) && ms > Date.now();
}

export async function listAllUsers(supabaseAdmin: ReturnType<typeof createClient>) {
  const users: Array<{
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string | null;
    email_confirmed_at?: string | null;
    banned_until?: string | null;
    app_metadata?: Record<string, unknown>;
  }> = [];

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 200) break;
  }

  return users;
}
