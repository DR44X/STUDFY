import { createClient } from "npm:@supabase/supabase-js@2";
import { UUID_RE, isUserSuspended, json, listAllUsers } from "./shared.ts";

type AdminClient = ReturnType<typeof createClient>;
type AuditFn = (p: {
  action: string;
  targetUserId?: string | null;
  targetLabel?: string | null;
  outcome: "success" | "error";
  details?: Record<string, unknown>;
}) => Promise<void>;

export async function handleUserActions(
  action: string,
  body: Record<string, unknown>,
  callerId: string,
  supabaseAdmin: AdminClient,
  recordAudit: AuditFn,
): Promise<Response | null> {
  if (action === "list_users") {
    const search = typeof body.search === "string" ? body.search.trim().toLowerCase() : "";
    const dateFrom = typeof body.dateFrom === "string" ? body.dateFrom : "";
    const dateTo = typeof body.dateTo === "string" ? body.dateTo : "";
    const statusFilter = typeof body.status === "string" ? body.status : "all";
    const roleFilter = typeof body.role === "string" ? body.role : "all";

    const [authUsers, profilesRes, plansRes, activitiesRes, logsRes] = await Promise.all([
      listAllUsers(supabaseAdmin),
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin.from("study_plans").select("id, user_id"),
      supabaseAdmin.from("study_activities").select("user_id, done"),
      supabaseAdmin.from("study_logs").select("user_id, completed_minutes"),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const plansCountMap = new Map<string, number>();
    for (const p of plansRes.data ?? []) {
      plansCountMap.set(p.user_id, (plansCountMap.get(p.user_id) ?? 0) + 1);
    }
    const actStatsMap = new Map<string, { total: number; done: number }>();
    for (const a of activitiesRes.data ?? []) {
      const cur = actStatsMap.get(a.user_id) ?? { total: 0, done: 0 };
      cur.total += 1;
      if (a.done) cur.done += 1;
      actStatsMap.set(a.user_id, cur);
    }
    const minutesMap = new Map<string, number>();
    for (const l of logsRes.data ?? []) {
      minutesMap.set(l.user_id, (minutesMap.get(l.user_id) ?? 0) + (l.completed_minutes ?? 0));
    }

    const items = authUsers
      .map((u) => {
        const p = profileMap.get(u.id);
        const role = p?.role === "admin" || u.app_metadata?.role === "admin" ? "admin" : "student";
        const status = isUserSuspended(u, p?.status) ? "suspended" : "active";
        const actStats = actStatsMap.get(u.id) ?? { total: 0, done: 0 };

        return {
          id: u.id,
          email: u.email ?? "",
          full_name: p?.full_name ?? null,
          username: p?.username ?? null,
          avatar_url: p?.avatar_url ?? null,
          role,
          status,
          onboarding_completed: Boolean(p?.onboarding_completed),
          email_confirmed: Boolean(u.email_confirmed_at),
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          suspended_at: p?.suspended_at ?? null,
          suspended_reason: p?.suspended_reason ?? null,
          plans_count: plansCountMap.get(u.id) ?? 0,
          activities_total: actStats.total,
          activities_done: actStats.done,
          study_minutes_total: minutesMap.get(u.id) ?? 0,
        };
      })
      .filter((u) => {
        if (search) {
          const hay = `${u.full_name ?? ""} ${u.email} ${u.username ?? ""}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        if (dateFrom && u.created_at.slice(0, 10) < dateFrom) return false;
        if (dateTo && u.created_at.slice(0, 10) > dateTo) return false;
        if (statusFilter !== "all" && u.status !== statusFilter) return false;
        if (roleFilter !== "all" && u.role !== roleFilter) return false;
        return true;
      })
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

    return json({ users: items });
  }

  if (action === "get_user_detail") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!UUID_RE.test(userId)) return json({ error: "ID de usuário inválido." }, 400);

    const [userRes, profileRes, prefsRes, progressRes, plansRes, activitiesRes, logsRes, sessionsRes, eventsRes] =
      await Promise.all([
        supabaseAdmin.auth.admin.getUserById(userId),
        supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabaseAdmin.from("study_preferences").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("study_progress").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("study_plans").select("*").eq("user_id", userId).order("week_start", { ascending: false }),
        supabaseAdmin.from("study_activities").select("*").eq("user_id", userId).order("day_index", { ascending: true }).order("position", { ascending: true }),
        supabaseAdmin.from("study_logs").select("*").eq("user_id", userId).order("study_date", { ascending: false }).limit(30),
        supabaseAdmin.rpc("admin_list_active_sessions"),
        supabaseAdmin.from("auth_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      ]);

    if (userRes.error || !userRes.data?.user) {
      return json({ error: "Usuário não encontrado." }, 404);
    }

    const u = userRes.data.user;
    const p = profileRes.data;
    const activeSessions = (Array.isArray(sessionsRes.data) ? sessionsRes.data : []).filter(
      (s: { user_id: string }) => s.user_id === userId,
    );

    return json({
      user: {
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        banned_until: u.banned_until ?? null,
        role: p?.role === "admin" || u.app_metadata?.role === "admin" ? "admin" : "student",
        status: isUserSuspended(u, p?.status) ? "suspended" : "active",
        full_name: p?.full_name ?? null,
        username: p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
        onboarding_completed: Boolean(p?.onboarding_completed),
        suspended_at: p?.suspended_at ?? null,
        suspended_reason: p?.suspended_reason ?? null,
      },
      preferences: prefsRes.data ?? null,
      progress: progressRes.data ?? null,
      plans: plansRes.data ?? [],
      activities: activitiesRes.data ?? [],
      studyLogs: logsRes.data ?? [],
      activeSessions,
      authEvents: eventsRes.data ?? [],
    });
  }

  if (action === "list_sessions_and_events") {
    const eventFilter = typeof body.eventType === "string" ? body.eventType : "all";

    const [authUsers, profilesRes, sessionsRes, eventsRes] = await Promise.all([
      listAllUsers(supabaseAdmin),
      supabaseAdmin.from("profiles").select("id, full_name"),
      supabaseAdmin.rpc("admin_list_active_sessions"),
      (() => {
        let q = supabaseAdmin.from("auth_events").select("*").order("created_at", { ascending: false }).limit(100);
        if (eventFilter !== "all") q = q.eq("event_type", eventFilter);
        return q;
      })(),
    ]);

    const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));
    const nameMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? ""]));

    const sessions = (Array.isArray(sessionsRes.data) ? sessionsRes.data : []).map((s: Record<string, unknown>) => ({
      ...s,
      email: emailMap.get(String(s.user_id)) ?? null,
      full_name: nameMap.get(String(s.user_id)) ?? null,
    }));

    const events = (eventsRes.data ?? []).map((ev) => ({
      ...ev,
      full_name: ev.user_id ? nameMap.get(ev.user_id) ?? null : null,
    }));

    return json({ sessions, events });
  }

  if (action === "revoke_session") {
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!UUID_RE.test(sessionId)) return json({ error: "ID de sessão inválido." }, 400);

    const { data: revokedUserId, error } = await supabaseAdmin.rpc("admin_revoke_session", {
      target_session_id: sessionId,
    });

    if (error) {
      await recordAudit({ action: "revoke_session", outcome: "error", details: { session_id: sessionId } });
      return json({ error: "Não foi possível encerrar a sessão." }, 500);
    }

    if (revokedUserId) {
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(revokedUserId);
      await supabaseAdmin.from("auth_events").insert({
        user_id: revokedUserId,
        actor_email: targetUser?.user?.email ?? null,
        event_type: "session_revoked",
        metadata: { session_id: sessionId, by_admin: callerId },
      });
      await recordAudit({
        action: "revoke_session",
        targetUserId: revokedUserId,
        targetLabel: targetUser?.user?.email ?? revokedUserId,
        outcome: "success",
        details: { session_id: sessionId },
      });
    }

    return json({ ok: true, revokedUserId });
  }

  if (action === "revoke_user_sessions") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!UUID_RE.test(userId)) return json({ error: "ID de usuário inválido." }, 400);

    const { data: targetUserRes, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetErr || !targetUserRes?.user) return json({ error: "Usuário não encontrado." }, 404);

    const { data: count, error } = await supabaseAdmin.rpc("admin_revoke_user_sessions", {
      target_user_id: userId,
    });

    if (error) {
      await recordAudit({
        action: "revoke_user_sessions",
        targetUserId: userId,
        targetLabel: targetUserRes.user.email ?? userId,
        outcome: "error",
      });
      return json({ error: "Não foi possível encerrar as sessões da conta." }, 500);
    }

    await supabaseAdmin.from("auth_events").insert({
      user_id: userId,
      actor_email: targetUserRes.user.email ?? null,
      event_type: "session_revoked",
      metadata: { scope: "all_sessions", count: count ?? 0, by_admin: callerId },
    });

    await recordAudit({
      action: "revoke_user_sessions",
      targetUserId: userId,
      targetLabel: targetUserRes.user.email ?? userId,
      outcome: "success",
      details: { sessions_revoked: count ?? 0 },
    });

    return json({ ok: true, count: count ?? 0 });
  }

  if (action === "suspend_user") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";

    if (!UUID_RE.test(userId)) return json({ error: "ID de usuário inválido." }, 400);
    if (userId === callerId) {
      return json({ error: "Você não pode suspender a sua própria conta administrativa." }, 400);
    }

    const { data: targetUserRes, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetErr || !targetUserRes?.user) return json({ error: "Usuário não encontrado." }, 404);

    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (banError) {
      await recordAudit({
        action: "suspend_user",
        targetUserId: userId,
        targetLabel: targetUserRes.user.email ?? userId,
        outcome: "error",
        details: { reason },
      });
      return json({ error: "Não foi possível suspender a conta no serviço de autenticação." }, 500);
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        status: "suspended",
        suspended_at: new Date().toISOString(),
        suspended_reason: reason || null,
        suspended_by: callerId,
      })
      .eq("id", userId);

    await supabaseAdmin.rpc("admin_revoke_user_sessions", { target_user_id: userId });

    await supabaseAdmin.from("auth_events").insert({
      user_id: userId,
      actor_email: targetUserRes.user.email ?? null,
      event_type: "session_revoked",
      metadata: { scope: "account_suspended", by_admin: callerId },
    });

    await recordAudit({
      action: "suspend_user",
      targetUserId: userId,
      targetLabel: targetUserRes.user.email ?? userId,
      outcome: "success",
      details: { reason: reason || null },
    });

    return json({ ok: true });
  }

  if (action === "reactivate_user") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!UUID_RE.test(userId)) return json({ error: "ID de usuário inválido." }, 400);

    const { data: targetUserRes, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetErr || !targetUserRes?.user) return json({ error: "Usuário não encontrado." }, 404);

    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
    if (unbanError) {
      await recordAudit({
        action: "reactivate_user",
        targetUserId: userId,
        targetLabel: targetUserRes.user.email ?? userId,
        outcome: "error",
      });
      return json({ error: "Não foi possível reativar a conta." }, 500);
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        status: "active",
        suspended_at: null,
        suspended_reason: null,
        suspended_by: null,
      })
      .eq("id", userId);

    await recordAudit({
      action: "reactivate_user",
      targetUserId: userId,
      targetLabel: targetUserRes.user.email ?? userId,
      outcome: "success",
    });

    return json({ ok: true });
  }

  return null;
}
