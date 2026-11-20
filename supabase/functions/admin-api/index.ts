import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { CORS_HEADERS, json } from "./shared.ts";
import { handleUserActions } from "./handlers_users.ts";
import { handleSystemActions } from "./handlers_system.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Configuração do servidor incompleta." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Autenticação obrigatória." }, 401);
    }

    const jwt = authHeader.slice(7).trim();
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerData, error: callerError } = await supabaseAuth.auth.getUser(jwt);
    if (callerError || !callerData?.user) {
      return json({ error: "Sessão inválida ou expirada." }, 401);
    }

    const caller = callerData.user;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerProfile, error: callerProfErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, status")
      .eq("id", caller.id)
      .maybeSingle();

    const isCallerAdmin =
      !callerProfErr &&
      caller.app_metadata?.role === "admin" &&
      callerProfile?.role === "admin" &&
      callerProfile?.status === "active";

    if (!isCallerAdmin) {
      return json({ error: "Acesso restrito a administradores ativos." }, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).action !== "string") {
      return json({ error: "Ação inválida." }, 400);
    }

    const payload = body as Record<string, unknown>;
    const action = payload.action as string;

    const recordAudit = async (params: {
      action: string;
      targetUserId?: string | null;
      targetLabel?: string | null;
      outcome: "success" | "error";
      details?: Record<string, unknown>;
    }) => {
      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_user_id: caller.id,
        admin_email: caller.email ?? null,
        action: params.action,
        target_user_id: params.targetUserId ?? null,
        target_label: params.targetLabel ?? null,
        outcome: params.outcome,
        details: params.details ?? {},
      });
    };

    const userRes = await handleUserActions(action, payload, caller.id, supabaseAdmin, recordAudit);
    if (userRes) return userRes;

    const sysRes = await handleSystemActions(action, payload, caller.id, supabaseAdmin, recordAudit);
    if (sysRes) return sysRes;

    return json({ error: "Ação administrativa desconhecida." }, 400);
  } catch (err) {
    console.error("[admin-api] unexpected error:", err instanceof Error ? err.message : "unknown");
    return json({ error: "Erro interno ao processar requisição administrativa." }, 500);
  }
});
