import type { SubjectId } from '../data/subjects';
import { addDays, fromISODate, toISODate, weekdayIndex } from './dates';
import type { Activity, WeekPlan } from './schedule';

export interface Totals {
  done: number;
  total: number;
  minutesDone: number;
  minutesTotal: number;
  percent: number;
}

export function totals(activities: Activity[]): Totals {
  let done = 0;
  let minutesDone = 0;
  let minutesTotal = 0;
  for (const a of activities) {
    minutesTotal += a.minutes;
    if (a.done) {
      done++;
      minutesDone += a.minutes;
    }
  }
  const total = activities.length;
  return { done, total, minutesDone, minutesTotal, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function activitiesOfDay(plan: WeekPlan, day: number): Activity[] {
  return plan.activities.filter((a) => a.day === day);
}

export function subjectsInPlan(plan: WeekPlan): { subjectId: SubjectId; totals: Totals }[] {
  const groups = new Map<SubjectId, Activity[]>();
  for (const a of plan.activities) {
    if (!groups.has(a.subjectId)) groups.set(a.subjectId, []);
    groups.get(a.subjectId)!.push(a);
  }
  return [...groups.entries()]
    .map(([subjectId, list]) => ({ subjectId, totals: totals(list) }))
    .sort((a, b) => b.totals.total - a.totals.total);
}

/**
 * Sequência de dias estudados. Dias de descanso do planejamento não quebram a sequência,
 * e o dia de hoje só conta quando houver atividade concluída.
 */
export function computeStreak(studyLog: Record<string, number>, studyDays: number[], since: string): number {
  const start = fromISODate(since.slice(0, 10));
  const today = new Date();
  let streak = 0;
  for (let d = new Date(today.getFullYear(), today.getMonth(), today.getDate()); d >= start; d = addDays(d, -1)) {
    const iso = toISODate(d);
    const isToday = iso === toISODate(today);
    if (studyLog[iso]) {
      streak++;
    } else if (isToday || !studyDays.includes(weekdayIndex(d))) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}
