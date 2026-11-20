import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Goal, Level, OnboardingAnswers } from '../data/onboarding';
import { isSubjectId, type SubjectId } from '../data/subjects';
import type { StudyActivityRow, StudyLogRow, StudyPlanRow } from '../types/database';
import { useAuth } from './auth';
import { translateAuthError } from './authErrors';
import { startOfWeek, toISODate } from './dates';
import { addCoverage, advanceCursor, generateWeekPlan, type Activity, type ActivityType, type WeekPlan } from './schedule';
import { readJSON, writeJSON } from './storage';
import { supabase } from './supabase';

export interface StudyData {
  planId?: string;
  onboarding?: OnboardingAnswers;
  plan?: WeekPlan;
  topicCursor: Partial<Record<SubjectId, number>>;
  coverage: Partial<Record<SubjectId, number>>;
  /** Quantidade de atividades concluídas por data (ISO). Base da sequência de estudos. */
  studyLog: Record<string, number>;
  /** Minutos estudados por data (ISO). */
  studyMinutesLog: Record<string, number>;
}

export type SaveOnboardingResult = { ok: true } | { ok: false; error: string };

interface StudyContextValue {
  data: StudyData;
  loading: boolean;
  syncError: string;
  clearSyncError: () => void;
  saveOnboarding: (answers: OnboardingAnswers) => Promise<SaveOnboardingResult>;
  toggleActivity: (id: string) => void;
  moveActivity: (id: string, toDay: number, toIndex: number) => void;
}

const EMPTY: StudyData = { topicCursor: {}, coverage: {}, studyLog: {}, studyMinutesLog: {} };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const StudyContext = createContext<StudyContextValue | null>(null);

function currentWeekStart(): string {
  return toISODate(startOfWeek(new Date()));
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseGoal(value: string): Goal {
  if (value === 'medicina' || value === 'publica' || value === 'bolsa' || value === 'nota') return value;
  return 'publica';
}

function parseLevel(value: string): Level {
  if (value === 'iniciante' || value === 'intermediario' || value === 'avancado') return value;
  return 'intermediario';
}

function parseActivityType(value: string): ActivityType {
  const allowed: ActivityType[] = [
    'Teoria',
    'Exercícios',
    'Teoria e exercícios',
    'Revisão',
    'Estrutura e repertório',
    'Produção de texto',
  ];
  return allowed.includes(value as ActivityType) ? (value as ActivityType) : 'Teoria';
}

function parseSubjectMap(raw: unknown): Partial<Record<SubjectId, number>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Partial<Record<SubjectId, number>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (isSubjectId(k) && typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      result[k] = Math.floor(v);
    }
  }
  return result;
}

function buildPlan(answers: OnboardingAnswers, data: StudyData): StudyData {
  let topicCursor = data.topicCursor;
  if (data.plan) topicCursor = advanceCursor(data.plan, topicCursor);
  const plan = generateWeekPlan(answers, { weekStart: currentWeekStart(), topicCursor, coverage: data.coverage });
  return { ...data, onboarding: answers, plan, topicCursor, coverage: addCoverage(plan, data.coverage) };
}

function mapRowsToPlan(planRow: StudyPlanRow, activityRows: StudyActivityRow[]): WeekPlan {
  const activities: Activity[] = activityRows
    .filter((row) => isSubjectId(row.subject_id))
    .map((row) => ({
      id: row.id,
      subjectId: row.subject_id as SubjectId,
      topic: row.topic,
      topicIndex: row.topic_index,
      type: parseActivityType(row.activity_type),
      minutes: row.minutes,
      day: row.day_index,
      done: row.done,
      doneAt: row.done_at ?? undefined,
    }));

  return {
    weekStart: planRow.week_start,
    studyDays: planRow.study_days,
    blockMinutes: planRow.block_minutes,
    activities,
  };
}

function mapLogsRows(rows: StudyLogRow[]): { studyLog: Record<string, number>; studyMinutesLog: Record<string, number> } {
  const studyLog: Record<string, number> = {};
  const studyMinutesLog: Record<string, number> = {};
  for (const row of rows) {
    if (row.completed_count > 0) {
      studyLog[row.study_date] = row.completed_count;
      studyMinutesLog[row.study_date] = row.completed_minutes;
    }
  }
  return { studyLog, studyMinutesLog };
}

/** Garante que IDs legados (não-UUID) sejam convertidos para UUIDs válidos antes de salvar no PostgreSQL. */
function ensureUuidActivities(activities: Activity[]): Activity[] {
  return activities.map((a) => (UUID_RE.test(a.id) ? a : { ...a, id: generateUuid() }));
}

async function persistPlanToSupabase(userId: string, plan: WeekPlan): Promise<string> {
  // Remove plano anterior da mesma semana do próprio usuário (cascade limpa study_activities da semana).
  const { error: deleteError } = await supabase
    .from('study_plans')
    .delete()
    .eq('user_id', userId)
    .eq('week_start', plan.weekStart);

  if (deleteError) throw deleteError;

  const { data: insertedPlan, error: planError } = await supabase
    .from('study_plans')
    .insert({
      user_id: userId,
      week_start: plan.weekStart,
      study_days: plan.studyDays,
      block_minutes: plan.blockMinutes,
    })
    .select('id')
    .single();

  if (planError || !insertedPlan) throw planError ?? new Error('Falha ao criar plano semanal.');

  if (plan.activities.length > 0) {
    const activityRows = plan.activities.map((a, idx) => ({
      id: UUID_RE.test(a.id) ? a.id : generateUuid(),
      plan_id: insertedPlan.id,
      user_id: userId,
      subject_id: a.subjectId,
      topic: a.topic,
      topic_index: a.topicIndex,
      activity_type: a.type,
      minutes: a.minutes,
      day_index: a.day,
      position: idx,
      done: a.done,
      done_at: a.doneAt ?? null,
    }));

    const { error: actError } = await supabase.from('study_activities').insert(activityRows);
    if (actError) throw actError;
  }

  return insertedPlan.id;
}

async function persistProgressToSupabase(
  userId: string,
  topicCursor: Partial<Record<SubjectId, number>>,
  coverage: Partial<Record<SubjectId, number>>,
): Promise<void> {
  const { error } = await supabase.from('study_progress').upsert(
    {
      user_id: userId,
      topic_cursor: topicCursor,
      coverage,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

async function persistLogsToSupabase(
  userId: string,
  studyLog: Record<string, number>,
  studyMinutesLog: Record<string, number>,
): Promise<void> {
  const entries = Object.entries(studyLog).filter(([, count]) => count > 0);
  if (entries.length === 0) return;

  const rows = entries.map(([study_date, completed_count]) => ({
    user_id: userId,
    study_date,
    completed_count,
    completed_minutes: studyMinutesLog[study_date] ?? 0,
  }));

  const { error } = await supabase.from('study_logs').upsert(rows, { onConflict: 'user_id,study_date' });
  if (error) throw error;
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  const storageKey = user ? `data:${user.id}` : null;

  const [state, setState] = useState<{ key: string | null; data: StudyData }>(() => ({
    key: storageKey,
    data: storageKey ? { ...EMPTY, ...readJSON<Partial<StudyData>>(storageKey, {}) } : EMPTY,
  }));
  const [syncingUserId, setSyncingUserId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState('');
  const latestDataRef = useRef<StudyData>(state.data);
  latestDataRef.current = state.data;

  // Recarrega o cache local imediatamente quando o usuário da sessão muda.
  useEffect(() => {
    setSyncError('');
    if (!storageKey) {
      setState({ key: null, data: EMPTY });
      return;
    }
    const cached = readJSON<Partial<StudyData>>(storageKey, {});
    setState({ key: storageKey, data: { ...EMPTY, ...cached } });
  }, [storageKey]);

  // Carrega e sincroniza preferências, progresso, plano semanal e histórico a partir do Supabase.
  useEffect(() => {
    if (!user) {
      setSyncingUserId(null);
      return;
    }

    const currentUser = user;
    let cancelled = false;
    const key = `data:${currentUser.id}`;
    setSyncingUserId(currentUser.id);

    async function loadFromSupabase() {
      try {
        const [prefsRes, progressRes, logsRes, latestPlanRes] = await Promise.all([
          supabase.from('study_preferences').select('*').eq('user_id', currentUser.id).maybeSingle(),
          supabase.from('study_progress').select('*').eq('user_id', currentUser.id).maybeSingle(),
          supabase.from('study_logs').select('*').eq('user_id', currentUser.id),
          supabase
            .from('study_plans')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('week_start', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const firstError = prefsRes.error || progressRes.error || logsRes.error || latestPlanRes.error;
        if (firstError) {
          setSyncError(translateAuthError(firstError, 'Não foi possível carregar seus dados de estudo.'));
          return;
        }

        const prefs = prefsRes.data;
        const onboarding: OnboardingAnswers | undefined = prefs
          ? {
              goal: parseGoal(prefs.goal),
              dailyMinutes: prefs.daily_minutes,
              difficulties: prefs.difficulties.filter((id): id is SubjectId => isSubjectId(id)),
              level: parseLevel(prefs.level),
              daysPerWeek: prefs.days_per_week,
            }
          : undefined;

        const localCache = readJSON<Partial<StudyData>>(key, {});
        const remoteTopicCursor = progressRes.data ? parseSubjectMap(progressRes.data.topic_cursor) : null;
        const remoteCoverage = progressRes.data ? parseSubjectMap(progressRes.data.coverage) : null;
        const hasRemoteLogs = Boolean(logsRes.data && logsRes.data.length > 0);
        const mappedRemoteLogs = mapLogsRows(logsRes.data ?? []);

        let topicCursor = remoteTopicCursor ?? parseSubjectMap(localCache.topicCursor);
        let coverage = remoteCoverage ?? parseSubjectMap(localCache.coverage);
        const studyLog = hasRemoteLogs ? mappedRemoteLogs.studyLog : (localCache.studyLog ?? {});
        const studyMinutesLog = hasRemoteLogs ? mappedRemoteLogs.studyMinutesLog : (localCache.studyMinutesLog ?? {});

        let planId: string | undefined;
        let plan: WeekPlan | undefined;
        const weekStart = currentWeekStart();

        if (latestPlanRes.data) {
          const { data: actRows, error: actErr } = await supabase
            .from('study_activities')
            .select('*')
            .eq('plan_id', latestPlanRes.data.id)
            .eq('user_id', currentUser.id)
            .order('position', { ascending: true });

          if (cancelled) return;
          if (actErr) {
            setSyncError(translateAuthError(actErr, 'Não foi possível carregar as atividades do cronograma.'));
            return;
          }

          const remotePlan = mapRowsToPlan(latestPlanRes.data, actRows ?? []);

          if (remotePlan.weekStart === weekStart) {
            planId = latestPlanRes.data.id;
            plan = remotePlan;
          } else if (onboarding) {
            // Virou a semana: avança o cursor com base no que foi concluído e persiste o novo plano semanal.
            const rolled = buildPlan(onboarding, {
              ...EMPTY,
              onboarding,
              plan: remotePlan,
              topicCursor,
              coverage,
              studyLog,
              studyMinutesLog,
            });
            topicCursor = rolled.topicCursor;
            coverage = rolled.coverage;
            plan = rolled.plan;
            if (plan) {
              planId = await persistPlanToSupabase(currentUser.id, plan);
              await persistProgressToSupabase(currentUser.id, topicCursor, coverage);
            }
          }
        } else if (localCache.plan && localCache.plan.activities.length > 0) {
          // Migra dados locais pré-existentes apenas desta conta (chave `data:${user.id}`) para o Supabase.
          const sanitizedActivities = ensureUuidActivities(localCache.plan.activities);
          const migratedPlan: WeekPlan = { ...localCache.plan, activities: sanitizedActivities };

          if (migratedPlan.weekStart === weekStart || !onboarding) {
            plan = migratedPlan;
          } else {
            const rolled = buildPlan(onboarding, {
              ...EMPTY,
              onboarding,
              plan: migratedPlan,
              topicCursor,
              coverage,
              studyLog,
              studyMinutesLog,
            });
            topicCursor = rolled.topicCursor;
            coverage = rolled.coverage;
            plan = rolled.plan;
          }

          if (plan) {
            planId = await persistPlanToSupabase(currentUser.id, plan);
            await persistProgressToSupabase(currentUser.id, topicCursor, coverage);
            await persistLogsToSupabase(currentUser.id, studyLog, studyMinutesLog);
          }
        } else if (onboarding) {
          // Usuário concluiu onboarding antes da Etapa 2, mas ainda não tinha plano persistido no banco.
          const generated = buildPlan(onboarding, {
            ...EMPTY,
            onboarding,
            topicCursor,
            coverage,
            studyLog,
            studyMinutesLog,
          });
          topicCursor = generated.topicCursor;
          coverage = generated.coverage;
          plan = generated.plan;
          if (plan) {
            planId = await persistPlanToSupabase(currentUser.id, plan);
            await persistProgressToSupabase(currentUser.id, topicCursor, coverage);
          }
        }

        if (cancelled) return;

        const nextData: StudyData = {
          planId,
          onboarding: onboarding ?? localCache.onboarding,
          plan,
          topicCursor,
          coverage,
          studyLog,
          studyMinutesLog,
        };

        writeJSON(key, nextData);
        setState({ key, data: nextData });
        setSyncError('');
      } catch (err) {
        if (!cancelled) {
          setSyncError(
            translateAuthError(err as { message?: string; code?: string; status?: number }, 'Erro ao sincronizar seus estudos.'),
          );
        }
      } finally {
        if (!cancelled) {
          setSyncingUserId((curr) => (curr === currentUser.id ? null : curr));
        }
      }
    }

    void loadFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Ao retornar para a aba em uma nova semana, gera e persiste o próximo cronograma no Supabase.
  useEffect(() => {
    if (!user) return;
    const currentUser = user;

    const checkWeekRollover = async () => {
      const current = latestDataRef.current;
      if (!current.onboarding || !current.plan || current.plan.weekStart === currentWeekStart()) return;

      const rolled = buildPlan(current.onboarding, current);
      if (!rolled.plan) return;

      try {
        const planId = await persistPlanToSupabase(currentUser.id, rolled.plan);
        await persistProgressToSupabase(currentUser.id, rolled.topicCursor, rolled.coverage);

        const nextData: StudyData = { ...rolled, planId };
        writeJSON(`data:${currentUser.id}`, nextData);
        setState({ key: `data:${currentUser.id}`, data: nextData });
      } catch (err) {
        setSyncError(
          translateAuthError(err as { message?: string; code?: string; status?: number }, 'Não foi possível atualizar o cronograma da nova semana.'),
        );
      }
    };

    window.addEventListener('focus', checkWeekRollover);
    return () => window.removeEventListener('focus', checkWeekRollover);
  }, [user]);

  const saveOnboarding = useCallback<StudyContextValue['saveOnboarding']>(
    async (answers) => {
      if (!user) {
        return { ok: false, error: 'Sessão não encontrada. Faça login novamente.' };
      }

      const { error: prefsError } = await supabase.from('study_preferences').upsert(
        {
          user_id: user.id,
          goal: answers.goal,
          daily_minutes: answers.dailyMinutes,
          difficulties: answers.difficulties,
          level: answers.level,
          days_per_week: answers.daysPerWeek,
        },
        { onConflict: 'user_id' },
      );

      if (prefsError) {
        return {
          ok: false,
          error: translateAuthError(prefsError, 'Não foi possível salvar suas preferências de estudo.'),
        };
      }

      const profileResult = await updateProfile({ onboarding_completed: true });
      if (!profileResult.ok) {
        return { ok: false, error: profileResult.error };
      }

      const key = `data:${user.id}`;
      const base = state.key === key ? state.data : { ...EMPTY, ...readJSON<Partial<StudyData>>(key, {}) };
      const next = buildPlan(answers, base);

      if (!next.plan) {
        return { ok: false, error: 'Não foi possível gerar o cronograma semanal.' };
      }

      try {
        const planId = await persistPlanToSupabase(user.id, next.plan);
        await persistProgressToSupabase(user.id, next.topicCursor, next.coverage);

        const finalData: StudyData = { ...next, planId };
        writeJSON(key, finalData);
        setState({ key, data: finalData });
        setSyncError('');
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: translateAuthError(
            err as { message?: string; code?: string; status?: number },
            'Não foi possível salvar seu cronograma no servidor.',
          ),
        };
      }
    },
    [state.data, state.key, updateProfile, user],
  );

  const toggleActivity = useCallback(
    (id: string) => {
      if (!user) return;
      const currentUser = user;
      const key = `data:${currentUser.id}`;
      const prevData = latestDataRef.current;
      if (!prevData.plan) return;

      const target = prevData.plan.activities.find((a) => a.id === id);
      if (!target) return;

      const today = toISODate(new Date());
      const nextDone = !target.done;
      const nextDoneAt = nextDone ? today : undefined;
      const logDate = nextDone ? today : (target.doneAt ?? today);

      const studyLog = { ...prevData.studyLog };
      const studyMinutesLog = { ...prevData.studyMinutesLog };

      if (nextDone) {
        studyLog[logDate] = (studyLog[logDate] ?? 0) + 1;
        studyMinutesLog[logDate] = (studyMinutesLog[logDate] ?? 0) + target.minutes;
      } else {
        if (target.doneAt && studyLog[target.doneAt]) {
          studyLog[target.doneAt] = Math.max(0, studyLog[target.doneAt] - 1);
          if (studyLog[target.doneAt] === 0) delete studyLog[target.doneAt];
        }
        if (target.doneAt && studyMinutesLog[target.doneAt]) {
          studyMinutesLog[target.doneAt] = Math.max(0, studyMinutesLog[target.doneAt] - target.minutes);
          if (studyMinutesLog[target.doneAt] === 0) delete studyMinutesLog[target.doneAt];
        }
      }

      const nextActivities = prevData.plan.activities.map((a) =>
        a.id === id ? { ...a, done: nextDone, doneAt: nextDoneAt } : a,
      );
      const nextData: StudyData = {
        ...prevData,
        studyLog,
        studyMinutesLog,
        plan: { ...prevData.plan, activities: nextActivities },
      };

      setSyncError('');
      writeJSON(key, nextData);
      setState({ key, data: nextData });

      void (async () => {
        try {
          const { error: actError } = await supabase
            .from('study_activities')
            .update({ done: nextDone, done_at: nextDoneAt ?? null })
            .eq('id', id)
            .eq('user_id', currentUser.id);

          if (actError) throw actError;

          const countForDate = studyLog[logDate] ?? 0;
          const minutesForDate = studyMinutesLog[logDate] ?? 0;

          if (countForDate > 0) {
            const { error: logError } = await supabase.from('study_logs').upsert(
              {
                user_id: currentUser.id,
                study_date: logDate,
                completed_count: countForDate,
                completed_minutes: minutesForDate,
              },
              { onConflict: 'user_id,study_date' },
            );
            if (logError) throw logError;
          } else {
            const { error: delLogError } = await supabase
              .from('study_logs')
              .delete()
              .eq('user_id', currentUser.id)
              .eq('study_date', logDate);
            if (delLogError) throw delLogError;
          }
        } catch (err) {
          // Reverte atualização otimista se falhar no Supabase.
          writeJSON(key, prevData);
          setState({ key, data: prevData });
          setSyncError(
            translateAuthError(
              err as { message?: string; code?: string; status?: number },
              'Não foi possível salvar a conclusão da atividade.',
            ),
          );
        }
      })();
    },
    [user],
  );

  const moveActivity = useCallback(
    (id: string, toDay: number, toIndex: number) => {
      if (!user) return;
      const currentUser = user;
      const key = `data:${currentUser.id}`;
      const prevData = latestDataRef.current;
      if (!prevData.plan) return;

      const list = prevData.plan.activities;
      const moving = list.find((a) => a.id === id);
      if (!moving) return;

      const rest = list.filter((a) => a.id !== id);
      const targetDay = rest.filter((a) => a.day === toDay);
      const clamped = Math.max(0, Math.min(toIndex, targetDay.length));
      const moved = { ...moving, day: toDay };

      let insertAt: number;
      if (clamped < targetDay.length) {
        insertAt = rest.indexOf(targetDay[clamped]);
      } else if (targetDay.length) {
        insertAt = rest.indexOf(targetDay[targetDay.length - 1]) + 1;
      } else {
        insertAt = rest.length;
      }

      const activities = [...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)];
      const nextData: StudyData = {
        ...prevData,
        plan: { ...prevData.plan, activities },
      };

      setSyncError('');
      writeJSON(key, nextData);
      setState({ key, data: nextData });

      const changedUpdates = activities
        .map((a, idx) => ({ a, idx }))
        .filter(({ a, idx }) => {
          const prevIdx = list.findIndex((old) => old.id === a.id);
          const prevAct = list[prevIdx];
          return !prevAct || prevAct.day !== a.day || prevIdx !== idx;
        });

      if (changedUpdates.length === 0) return;

      void (async () => {
        try {
          const results = await Promise.all(
            changedUpdates.map(({ a, idx }) =>
              supabase
                .from('study_activities')
                .update({ day_index: a.day, position: idx })
                .eq('id', a.id)
                .eq('user_id', currentUser.id),
            ),
          );
          const failed = results.find((r) => r.error);
          if (failed?.error) throw failed.error;
        } catch (err) {
          writeJSON(key, prevData);
          setState({ key, data: prevData });
          setSyncError(
            translateAuthError(
              err as { message?: string; code?: string; status?: number },
              'Não foi possível salvar a nova ordem do cronograma.',
            ),
          );
        }
      })();
    },
    [user],
  );

  const clearSyncError = useCallback(() => setSyncError(''), []);

  const data = state.key === storageKey ? state.data : EMPTY;
  const loading = Boolean(user && syncingUserId === user.id);

  const value = useMemo(
    () => ({ data, loading, syncError, clearSyncError, saveOnboarding, toggleActivity, moveActivity }),
    [data, loading, syncError, clearSyncError, saveOnboarding, toggleActivity, moveActivity],
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy deve ser usado dentro de StudyProvider');
  return ctx;
}
