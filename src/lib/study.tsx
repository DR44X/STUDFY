import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { OnboardingAnswers } from '../data/onboarding';
import type { SubjectId } from '../data/subjects';
import { useAuth } from './auth';
import { startOfWeek, toISODate } from './dates';
import { addCoverage, advanceCursor, generateWeekPlan, type WeekPlan } from './schedule';
import { readJSON, writeJSON } from './storage';

export interface StudyData {
  onboarding?: OnboardingAnswers;
  plan?: WeekPlan;
  topicCursor: Partial<Record<SubjectId, number>>;
  coverage: Partial<Record<SubjectId, number>>;
  /** Quantidade de atividades concluídas por data (ISO). Base da sequência de estudos. */
  studyLog: Record<string, number>;
}

interface StudyContextValue {
  data: StudyData;
  saveOnboarding: (answers: OnboardingAnswers) => void;
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

export function StudyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `data:${user.id}` : null;
  const [state, setState] = useState<{ key: string | null; data: StudyData }>(() => ({
    key: storageKey,
    data: storageKey ? readJSON(storageKey, EMPTY) : EMPTY,
  }));

  // Recarrega os dados quando o usuário da sessão muda.
  const data = state.key === storageKey ? state.data : storageKey ? readJSON(storageKey, EMPTY) : EMPTY;
  if (state.key !== storageKey) setState({ key: storageKey, data });

  const update = useCallback(
    (fn: (prev: StudyData) => StudyData) => {
      setState((prev) => {
        const next = fn(prev.data);
        if (prev.key) writeJSON(prev.key, next);
        return { key: prev.key, data: next };
      });
    },
    [],
  );

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

  const saveOnboarding = useCallback(
    (answers: OnboardingAnswers) => update((prev) => buildPlan(answers, prev)),
    [update],
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

  const value = useMemo(
    () => ({ data, saveOnboarding, toggleActivity, moveActivity }),
    [data, saveOnboarding, toggleActivity, moveActivity],
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy deve ser usado dentro de StudyProvider');
  return ctx;
}
