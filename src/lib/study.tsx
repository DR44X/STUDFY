import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Goal, Level, OnboardingAnswers } from '../data/onboarding';
import { isSubjectId, type SubjectId } from '../data/subjects';
import { useAuth } from './auth';
import { translateAuthError } from './authErrors';
import { startOfWeek, toISODate } from './dates';
import { addCoverage, advanceCursor, generateWeekPlan, type WeekPlan } from './schedule';
import { readJSON, writeJSON } from './storage';
import { supabase } from './supabase';

export interface StudyData {
  onboarding?: OnboardingAnswers;
  plan?: WeekPlan;
  topicCursor: Partial<Record<SubjectId, number>>;
  coverage: Partial<Record<SubjectId, number>>;
  /** Quantidade de atividades concluídas por data (ISO). Base da sequência de estudos. */
  studyLog: Record<string, number>;
}

export type SaveOnboardingResult = { ok: true } | { ok: false; error: string };

interface StudyContextValue {
  data: StudyData;
  loading: boolean;
  saveOnboarding: (answers: OnboardingAnswers) => Promise<SaveOnboardingResult>;
  toggleActivity: (id: string) => void;
  moveActivity: (id: string, toDay: number, toIndex: number) => void;
}

const EMPTY: StudyData = { topicCursor: {}, coverage: {}, studyLog: {} };

const StudyContext = createContext<StudyContextValue | null>(null);

function currentWeekStart(): string {
  return toISODate(startOfWeek(new Date()));
}

function buildPlan(answers: OnboardingAnswers, data: StudyData): StudyData {
  let topicCursor = data.topicCursor;
  if (data.plan) topicCursor = advanceCursor(data.plan, topicCursor);
  const plan = generateWeekPlan(answers, { weekStart: currentWeekStart(), topicCursor, coverage: data.coverage });
  return { ...data, onboarding: answers, plan, topicCursor, coverage: addCoverage(plan, data.coverage) };
}

function parseGoal(value: string): Goal {
  if (value === 'medicina' || value === 'publica' || value === 'bolsa' || value === 'nota') return value;
  return 'publica';
}

function parseLevel(value: string): Level {
  if (value === 'iniciante' || value === 'intermediario' || value === 'avancado') return value;
  return 'intermediario';
}

function sameAnswers(a: OnboardingAnswers | undefined, b: OnboardingAnswers): boolean {
  if (!a) return false;
  return (
    a.goal === b.goal &&
    a.dailyMinutes === b.dailyMinutes &&
    a.level === b.level &&
    a.daysPerWeek === b.daysPerWeek &&
    a.difficulties.length === b.difficulties.length &&
    a.difficulties.every((d, i) => d === b.difficulties[i])
  );
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  const storageKey = user ? `data:${user.id}` : null;

  const [state, setState] = useState<{ key: string | null; data: StudyData }>(() => ({
    key: storageKey,
    data: storageKey ? readJSON(storageKey, EMPTY) : EMPTY,
  }));
  const [syncingUserId, setSyncingUserId] = useState<string | null>(null);

  // Recarrega o cache local imediatamente quando o usuário da sessão muda.
  useEffect(() => {
    setState({
      key: storageKey,
      data: storageKey ? readJSON(storageKey, EMPTY) : EMPTY,
    });
  }, [storageKey]);

  // Sincroniza as preferências do onboarding a partir do Supabase PostgreSQL.
  useEffect(() => {
    if (!user) {
      setSyncingUserId(null);
      return;
    }

    let cancelled = false;
    const key = `data:${user.id}`;
    setSyncingUserId(user.id);

    async function loadFromSupabase() {
      try {
        const { data: prefs, error } = await supabase
          .from('study_preferences')
          .select('*')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (cancelled || error || !prefs) return;

        const remoteAnswers: OnboardingAnswers = {
          goal: parseGoal(prefs.goal),
          dailyMinutes: prefs.daily_minutes,
          difficulties: prefs.difficulties.filter((id): id is SubjectId => isSubjectId(id)),
          level: parseLevel(prefs.level),
          daysPerWeek: prefs.days_per_week,
        };

        setState((prev) => {
          const base = prev.key === key ? prev.data : readJSON(key, EMPTY);
          const needsPlan = !base.plan || base.plan.weekStart !== currentWeekStart() || !sameAnswers(base.onboarding, remoteAnswers);
          const next = needsPlan ? buildPlan(remoteAnswers, base) : { ...base, onboarding: remoteAnswers };
          writeJSON(key, next);
          return { key, data: next };
        });
      } finally {
        if (!cancelled) {
          setSyncingUserId((curr) => (curr === user!.id ? null : curr));
        }
      }
    }

    void loadFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const update = useCallback((fn: (prev: StudyData) => StudyData) => {
    setState((prev) => {
      const next = fn(prev.data);
      if (prev.key) writeJSON(prev.key, next);
      return { key: prev.key, data: next };
    });
  }, []);

  // Ao iniciar uma nova semana, gera o próximo cronograma a partir do progresso anterior.
  useEffect(() => {
    const check = () => {
      update((prev) =>
        prev.onboarding && prev.plan && prev.plan.weekStart !== currentWeekStart() ? buildPlan(prev.onboarding, prev) : prev,
      );
    };
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [update, storageKey]);

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
      setState((prev) => {
        const base = prev.key === key ? prev.data : readJSON(key, EMPTY);
        const next = buildPlan(answers, base);
        writeJSON(key, next);
        return { key, data: next };
      });

      return { ok: true };
    },
    [updateProfile, user],
  );

  const toggleActivity = useCallback(
    (id: string) =>
      update((prev) => {
        if (!prev.plan) return prev;
        const today = toISODate(new Date());
        const studyLog = { ...prev.studyLog };
        const activities = prev.plan.activities.map((a) => {
          if (a.id !== id) return a;
          if (a.done) {
            if (a.doneAt && studyLog[a.doneAt]) {
              studyLog[a.doneAt] -= 1;
              if (studyLog[a.doneAt] <= 0) delete studyLog[a.doneAt];
            }
            return { ...a, done: false, doneAt: undefined };
          }
          studyLog[today] = (studyLog[today] ?? 0) + 1;
          return { ...a, done: true, doneAt: today };
        });
        return { ...prev, studyLog, plan: { ...prev.plan, activities } };
      }),
    [update],
  );

  const moveActivity = useCallback(
    (id: string, toDay: number, toIndex: number) =>
      update((prev) => {
        if (!prev.plan) return prev;
        const list = prev.plan.activities;
        const moving = list.find((a) => a.id === id);
        if (!moving) return prev;
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
        return { ...prev, plan: { ...prev.plan, activities } };
      }),
    [update],
  );

  const data = state.key === storageKey ? state.data : EMPTY;
  const loading = Boolean(user && syncingUserId === user.id);

  const value = useMemo(
    () => ({ data, loading, saveOnboarding, toggleActivity, moveActivity }),
    [data, loading, saveOnboarding, toggleActivity, moveActivity],
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy deve ser usado dentro de StudyProvider');
  return ctx;
}
