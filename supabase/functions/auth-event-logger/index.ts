import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_EVENTS = new Set([
  "login_success",
  "login_failed",
  "logout",
  "signup",
  "password_reset_request",
  "password_updated",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server configuration missing" }, 500);
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return json({ error: "Invalid payload" }, 400);
    }

    const eventType = typeof payload.event_type === "string" ? payload.event_type : "";
    if (!ALLOWED_EVENTS.has(eventType)) {
      return json({ error: "Unsupported event_type" }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: cfg } = await supabaseAdmin
      .from("admin_config")
      .select("log_auth_events")
      .eq("id", "default")
      .maybeSingle();

    if (cfg && cfg.log_auth_events === false) {
      return json({ ok: true, skipped: true });
    }

    let userId: string | null = null;
    let verifiedEmail: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ") && anonKey) {
      const token = authHeader.slice(7).trim();
      if (token && token !== anonKey) {
        const supabaseAuth = createClient(supabaseUrl, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data } = await supabaseAuth.auth.getUser(token);
        if (data?.user) {
          userId = data.user.id;
          verifiedEmail = data.user.email ?? null;
        }
      }
    }

    // Never trust arbitrary user_id from unauthenticated requests
    const rawEmail = typeof payload.email === "string" ? payload.email.trim().toLowerCase().slice(0, 120) : null;
    const actorEmail = verifiedEmail ?? (rawEmail && rawEmail.includes("@") ? rawEmail : null);
    const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 240) || null;

    const safeMeta: Record<string, unknown> = {};
    if (typeof payload.reason === "string" && payload.reason.trim()) {
      safeMeta.reason = payload.reason.trim().slice(0, 120);
    }

    const { error } = await supabaseAdmin.from("auth_events").insert({
      user_id: userId,
      actor_email: actorEmail,
      event_type: eventType,
      user_agent: userAgent,
      metadata: safeMeta,
    });

    if (error) {
      return json({ error: "Failed to record auth event" }, 500);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Internal error" }, 500);
  }
});
