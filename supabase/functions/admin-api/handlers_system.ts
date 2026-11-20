import { createClient } from "npm:@supabase/supabase-js@2";
import { HEX_RE, isUserSuspended, isoDateOnly, json, listAllUsers } from "./shared.ts";

type AdminClient = ReturnType<typeof createClient>;
type AuditFn = (p: {
  action: string;
  targetUserId?: string | null;
  targetLabel?: string | null;
  outcome: "success" | "error";
  details?: Record<string, unknown>;
}) => Promise<void>;

const ALLOWED_TABLES = [
  "profiles",
  "study_preferences",
  "study_progress",
  "study_plans",
  "study_activities",
  "study_logs",
  "site_settings",
  "admin_config",
  "auth_events",
  "admin_audit_logs",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

const ALLOWED_FEATURE_KEYS = new Set([
  "schedule",
  "dashboard",
  "profile",
  "study_history",
  "exams_simulados",
  "essay_redacao",
  "question_bank",
  "community",
]);

export async function handleSystemActions(
  action: string,
  body: Record<string, unknown>,
  callerId: string,
  supabaseAdmin: AdminClient,
  recordAudit: AuditFn,
): Promise<Response | null> {
  if (action === "overview") {
    const [authUsers, profilesRes, plansRes, activitiesRes, logsRes, sessionsRes, eventsRes] = await Promise.all([
      listAllUsers(supabaseAdmin),
      supabaseAdmin.from("profiles").select("id, role, status, onboarding_completed, avatar_url, username, created_at"),
      supabaseAdmin.from("study_plans").select("id, user_id, created_at"),
      supabaseAdmin.from("study_activities").select("id, done, minutes"),
      supabaseAdmin.from("study_logs").select("study_date, completed_count, completed_minutes"),
      supabaseAdmin.rpc("admin_list_active_sessions"),
      supabaseAdmin
        .from("auth_events")
        .select("event_type, created_at")
        .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString()),
    ]);

    const profiles = profilesRes.data ?? [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const now = Date.now();
    const day7 = now - 7 * 86400000;
    const day30 = now - 30 * 86400000;
    const hours24 = now - 24 * 3600000;

    let activeUsers = 0;
    let suspendedUsers = 0;
    let newSignups7d = 0;
    let newSignups30d = 0;
    let recentLogins24h = 0;

    for (const u of authUsers) {
      const p = profileMap.get(u.id);
      if (isUserSuspended(u, p?.status)) suspendedUsers++;
      else if (u.email_confirmed_at) activeUsers++;

      const createdMs = Date.parse(u.created_at);
      if (createdMs >= day7) newSignups7d++;
      if (createdMs >= day30) newSignups30d++;

      const lastSignInMs = u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : NaN;
      if (Number.isFinite(lastSignInMs) && lastSignInMs >= hours24) recentLogins24h++;
    }

    const activities = activitiesRes.data ?? [];
    const completedActivitiesCount = activities.filter((a) => a.done).length;
    const completedMinutesTotal = (logsRes.data ?? []).reduce((sum, l) => sum + (l.completed_minutes ?? 0), 0);

    const days: string[] = [];
    for (let i = 13; i >= 0; i--) days.push(isoDateOnly(new Date(now - i * 86400000)));

    const signupsByDay = new Map<string, number>();
    for (const u of authUsers) {
      const d = u.created_at.slice(0, 10);
      signupsByDay.set(d, (signupsByDay.get(d) ?? 0) + 1);
    }

    const studyByDay = new Map<string, { count: number; minutes: number }>();
    for (const l of logsRes.data ?? []) {
      const cur = studyByDay.get(l.study_date) ?? { count: 0, minutes: 0 };
      cur.count += l.completed_count ?? 0;
      cur.minutes += l.completed_minutes ?? 0;
      studyByDay.set(l.study_date, cur);
    }

    const loginsByDay = new Map<string, number>();
    for (const ev of eventsRes.data ?? []) {
      if (ev.event_type === "login_success") {
        const d = ev.created_at.slice(0, 10);
        loginsByDay.set(d, (loginsByDay.get(d) ?? 0) + 1);
      }
    }

    const series = days.map((date) => ({
      date,
      signups: signupsByDay.get(date) ?? 0,
      completedActivities: studyByDay.get(date)?.count ?? 0,
      completedMinutes: studyByDay.get(date)?.minutes ?? 0,
      logins: loginsByDay.get(date) ?? 0,
    }));

    const onboardingCompletedCount = profiles.filter((p) => p.onboarding_completed).length;
    const avatarsUploadedCount = profiles.filter((p) => Boolean(p.avatar_url)).length;
    const usernamesSetCount = profiles.filter((p) => Boolean(p.username)).length;

    return json({
      kpis: {
        totalUsers: authUsers.length,
        activeUsers,
        suspendedUsers,
        newSignups7d,
        newSignups30d,
        recentLogins24h,
        activeSessionsCount: Array.isArray(sessionsRes.data) ? sessionsRes.data.length : 0,
        totalPlansCount: (plansRes.data ?? []).length,
        totalActivitiesCount: activities.length,
        completedActivitiesCount,
        completedMinutesTotal,
        onboardingCompletedCount,
      },
      featureUsage: [
        { label: "Onboarding concluído", count: onboardingCompletedCount, total: authUsers.length },
        { label: "Cronogramas gerados", count: new Set((plansRes.data ?? []).map((p) => p.user_id)).size, total: authUsers.length },
        { label: "Foto de perfil enviada", count: avatarsUploadedCount, total: authUsers.length },
        { label: "Username configurado", count: usernamesSetCount, total: authUsers.length },
      ],
      series,
    });
  }

  if (action === "update_site_settings") {
    const patch = body.settings as Record<string, unknown> | undefined;
    if (!patch || typeof patch !== "object") return json({ error: "Configurações inválidas." }, 400);

    const updatePayload: Record<string, unknown> = { updated_by: callerId };
    const strFields = [
      "site_name",
      "institutional_tagline",
      "hero_eyebrow",
      "hero_title",
      "hero_subtitle",
      "hero_cta_text",
      "announcement_text",
      "maintenance_message",
    ] as const;

    for (const f of strFields) {
      if (typeof patch[f] === "string") {
        const val = (patch[f] as string).trim().slice(0, 500);
        if ((f === "site_name" || f === "hero_title") && !val) {
          return json({ error: `O campo ${f} não pode ficar vazio.` }, 400);
        }
        updatePayload[f] = val;
      }
    }

    for (const colorField of ["primary_color", "accent_color"] as const) {
      if (typeof patch[colorField] === "string") {
        const val = (patch[colorField] as string).trim();
        if (!HEX_RE.test(val)) {
          return json({ error: `Cor inválida em ${colorField}. Use formato hexadecimal #RRGGBB.` }, 400);
        }
        updatePayload[colorField] = val;
      }
    }

    for (const urlField of ["logo_url", "favicon_url"] as const) {
      if (patch[urlField] === null || typeof patch[urlField] === "string") {
        const val = typeof patch[urlField] === "string" ? (patch[urlField] as string).trim() : null;
        if (val && !val.startsWith("https://") && !val.startsWith("/")) {
          return json({ error: `URL inválida em ${urlField}.` }, 400);
        }
        updatePayload[urlField] = val || null;
      }
    }

    for (const boolField of [
      "show_how_it_works",
      "show_features",
      "show_cta",
      "announcement_enabled",
      "maintenance_mode",
      "allow_public_signup",
    ] as const) {
      if (typeof patch[boolField] === "boolean") {
        updatePayload[boolField] = patch[boolField];
      }
    }

    if (patch.features && typeof patch.features === "object" && !Array.isArray(patch.features)) {
      const { data: currentRow } = await supabaseAdmin
        .from("site_settings")
        .select("features")
        .eq("id", "default")
        .maybeSingle();

      const mergedFeatures: Record<string, boolean> = {
        ...((currentRow?.features as Record<string, boolean>) ?? {}),
      };
      for (const [k, v] of Object.entries(patch.features as Record<string, unknown>)) {
        if (ALLOWED_FEATURE_KEYS.has(k) && typeof v === "boolean") {
          mergedFeatures[k] = v;
        }
      }
      updatePayload.features = mergedFeatures;
    }

    const { data: updated, error } = await supabaseAdmin
      .from("site_settings")
      .update(updatePayload)
      .eq("id", "default")
      .select("*")
      .single();

    if (error || !updated) {
      await recordAudit({ action: "update_site_settings", outcome: "error" });
      return json({ error: "Não foi possível salvar as configurações do site." }, 500);
    }

    const auditAction = patch.features && Object.keys(patch).length === 1 ? "update_features" : "update_site_settings";
    await recordAudit({
      action: auditAction,
      targetLabel: updated.site_name,
      outcome: "success",
      details: { updated_fields: Object.keys(updatePayload).filter((k) => k !== "updated_by") },
    });

    return json({ settings: updated });
  }

  if (action === "get_database_overview") {
    const selectedTable =
      typeof body.table === "string" && (ALLOWED_TABLES as readonly string[]).includes(body.table)
        ? (body.table as AllowedTable)
        : "profiles";

    const counts = await Promise.all(
      ALLOWED_TABLES.map(async (table) => {
        const { count } = await supabaseAdmin.from(table).select("*", { count: "exact", head: true });
        return { table, rows: count ?? 0 };
      }),
    );

    const orderColumn =
      selectedTable === "study_logs" || selectedTable === "site_settings" || selectedTable === "admin_config"
        ? "updated_at"
        : "created_at";

    const { data: sampleRows, error: sampleErr } = await supabaseAdmin
      .from(selectedTable)
      .select("*")
      .order(orderColumn, { ascending: false })
      .limit(15);

    if (sampleErr) {
      return json({ error: "Não foi possível consultar a tabela selecionada." }, 500);
    }

    return json({
      tables: counts,
      selectedTable,
      rows: sampleRows ?? [],
    });
  }

  if (action === "get_audit_logs") {
    const actionFilter = typeof body.filterAction === "string" ? body.filterAction : "all";
    const outcomeFilter = typeof body.outcome === "string" ? body.outcome : "all";

    let q = supabaseAdmin.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(150);
    if (actionFilter !== "all") q = q.eq("action", actionFilter);
    if (outcomeFilter !== "all") q = q.eq("outcome", outcomeFilter);

    const { data, error } = await q;
    if (error) return json({ error: "Não foi possível carregar os logs de auditoria." }, 500);
    return json({ logs: data ?? [] });
  }

  if (action === "get_admin_config") {
    const { data, error } = await supabaseAdmin
      .from("admin_config")
      .select("*")
      .eq("id", "default")
      .maybeSingle();
    if (error) return json({ error: "Não foi possível carregar configurações administrativas." }, 500);
    return json({ config: data });
  }

  if (action === "update_admin_config") {
    const cfg = body.config as Record<string, unknown> | undefined;
    if (!cfg || typeof cfg !== "object") return json({ error: "Configuração inválida." }, 400);

    const payload: Record<string, unknown> = { updated_by: callerId };
    if (typeof cfg.log_auth_events === "boolean") payload.log_auth_events = cfg.log_auth_events;
    if (typeof cfg.admin_notes === "string") payload.admin_notes = cfg.admin_notes.slice(0, 2000);

    const { data, error } = await supabaseAdmin
      .from("admin_config")
      .update(payload)
      .eq("id", "default")
      .select("*")
      .single();

    if (error || !data) {
      await recordAudit({ action: "update_admin_config", outcome: "error" });
      return json({ error: "Não foi possível atualizar as configurações administrativas." }, 500);
    }

    await recordAudit({
      action: "update_admin_config",
      targetLabel: "Configurações administrativas",
      outcome: "success",
      details: { log_auth_events: data.log_auth_events },
    });

    return json({ config: data });
  }

  return null;
}
