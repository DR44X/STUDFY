import { SUBJECTS, getSubject, type SubjectId } from '../data/subjects';
import type { Goal, Level, OnboardingAnswers } from '../data/onboarding';

export type ActivityType = 'Teoria' | 'Exercícios' | 'Teoria e exercícios' | 'Revisão' | 'Estrutura e repertório' | 'Produção de texto';

export interface Activity {
  id: string;
  subjectId: SubjectId;
  topic: string;
  /** Índice absoluto do tópico na lista da matéria (usado para progressão entre semanas). */
  topicIndex: number;
  type: ActivityType;
  minutes: number;
  /** 0 = segunda ... 6 = domingo */
  day: number;
  done: boolean;
  /** Data ISO em que a atividade foi concluída. */
  doneAt?: string;
}

export interface WeekPlan {
  weekStart: string;
  studyDays: number[];
  blockMinutes: number;
  activities: Activity[];
}

/** Dias de estudo sugeridos conforme a quantidade escolhida (0 = segunda). */
const STUDY_DAYS: Record<number, number[]> = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function studyDaysFor(daysPerWeek: number): number[] {
  return STUDY_DAYS[daysPerWeek] ?? STUDY_DAYS[5];
}

/** Divide o tempo diário em blocos de estudo com duração confortável. */
export function blocksFor(dailyMinutes: number): { count: number; minutes: number } {
  const count = dailyMinutes <= 30 ? 1 : dailyMinutes <= 60 ? 2 : dailyMinutes <= 120 ? 3 : dailyMinutes <= 180 ? 4 : 5;
  const minutes = Math.round(dailyMinutes / count / 5) * 5;
  return { count, minutes };
}

const GOAL_BOOST: Record<Goal, Partial<Record<SubjectId, number>>> = {
  medicina: { biologia: 1.5, quimica: 1.4, fisica: 1.2, redacao: 1.2 },
  publica: {},
  bolsa: { redacao: 1.3, matematica: 1.2 },
  nota: {},
};

const DIFFICULTY_FACTOR = 2.2;

function subjectWeights(answers: OnboardingAnswers): Map<SubjectId, number> {
  const weights = new Map<SubjectId, number>();
  const difficultyFactor = answers.goal === 'nota' ? DIFFICULTY_FACTOR * 1.3 : DIFFICULTY_FACTOR;
  for (const subject of SUBJECTS) {
    let w = subject.baseWeight * (GOAL_BOOST[answers.goal][subject.id] ?? 1);
    if (answers.difficulties.includes(subject.id)) w *= difficultyFactor;
    weights.set(subject.id, w);
  }
  return weights;
}

/**
 * Distribui as vagas da semana entre as matérias (método de divisores, proporcional ao peso).
 * Em empate, prioriza a matéria que apareceu menos em semanas anteriores, garantindo rodízio.
 */
function allocateSessions(
  totalSlots: number,
  maxPerSubject: number,
  weights: Map<SubjectId, number>,
  coverage: Partial<Record<SubjectId, number>>,
): Map<SubjectId, number> {
  const counts = new Map<SubjectId, number>(SUBJECTS.map((s) => [s.id, 0]));
  for (let slot = 0; slot < totalSlots; slot++) {
    let best: SubjectId | null = null;
    let bestScore = -1;
    let bestHistory = Infinity;
    for (const subject of SUBJECTS) {
      const n = counts.get(subject.id)!;
      if (n >= maxPerSubject) continue;
      const score = weights.get(subject.id)! / (n + 1);
      const history = coverage[subject.id] ?? 0;
      const tie = Math.abs(score - bestScore) < 1e-9;
      if (score > bestScore + 1e-9 || (tie && history < bestHistory)) {
        bestScore = score;
        bestHistory = history;
        best = subject.id;
      }
    }
    if (!best) break;
    counts.set(best, counts.get(best)! + 1);
  }
  return counts;
}

/** Posiciona as sessões nos dias, espaçando as repetições de cada matéria. */
function placeOnDays(counts: Map<SubjectId, number>, studyDays: number[], perDay: number): Map<number, SubjectId[]> {
  const days = new Map<number, SubjectId[]>(studyDays.map((d) => [d, []]));
  const ordered = [...counts.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const D = studyDays.length;
  let offset = 0;

  for (const [subjectId, n] of ordered) {
    const step = D / n;
    for (let i = 0; i < n; i++) {
      const ideal = Math.floor(offset + i * step) % D;
      let placed = false;
      for (let k = 0; k < D && !placed; k++) {
        const day = studyDays[(ideal + k) % D];
        const list = days.get(day)!;
        if (list.length < perDay && !list.includes(subjectId)) {
          list.push(subjectId);
          placed = true;
        }
      }
      if (!placed) {
        // Sem alternativa: aceita repetir a matéria em um dia com espaço.
        const day = studyDays.find((d) => days.get(d)!.length < perDay);
        if (day !== undefined) days.get(day)!.push(subjectId);
      }
    }
    offset += 1;
  }
  return days;
}

/** Ordena as matérias do dia: dificuldades primeiro e áreas alternadas. */
function orderDay(list: SubjectId[], difficulties: SubjectId[]): SubjectId[] {
  const pool = [...list].sort((a, b) => Number(difficulties.includes(b)) - Number(difficulties.includes(a)));
  const result: SubjectId[] = [];
  while (pool.length) {
    const lastArea = result.length ? getSubject(result[result.length - 1]).area : null;
    const idx = pool.findIndex((s) => getSubject(s).area !== lastArea);
    result.push(pool.splice(idx === -1 ? 0 : idx, 1)[0]);
  }
  return result;
}

interface Step {
  offset: number;
  type: ActivityType;
}

/** Sequência de tópicos e tipos de atividade da matéria na semana, conforme nível e dificuldade. */
function sessionSteps(subjectId: SubjectId, n: number, level: Level, isDifficulty: boolean): Step[] {
  const steps: Step[] = [];
  if (subjectId === 'redacao') {
    for (let i = 0; i < n; i++) {
      const type: ActivityType = level === 'avancado' || i % 2 === 1 ? 'Produção de texto' : 'Estrutura e repertório';
      steps.push({ offset: level === 'avancado' ? i : Math.floor(i / 2), type });
    }
    return steps;
  }

  if (level === 'avancado') {
    for (let i = 0; i < n; i++) steps.push({ offset: i, type: 'Exercícios' });
    if (isDifficulty && n >= 3) steps[n - 1] = { offset: 0, type: 'Revisão' };
    return steps;
  }

  const paired = level === 'iniciante' || isDifficulty;
  if (paired) {
    for (let i = 0; i < n; i++) {
      steps.push({ offset: Math.floor(i / 2), type: i % 2 === 0 ? 'Teoria' : 'Exercícios' });
    }
    if (n === 1) steps[0].type = 'Teoria e exercícios';
    if (isDifficulty && n >= 4 && n % 2 === 1) steps[n - 1] = { offset: 0, type: 'Revisão' };
  } else {
    for (let i = 0; i < n; i++) steps.push({ offset: i, type: 'Teoria e exercícios' });
  }
  return steps;
}

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface GenerateOptions {
  weekStart: string;
  topicCursor: Partial<Record<SubjectId, number>>;
  coverage: Partial<Record<SubjectId, number>>;
}

export function generateWeekPlan(answers: OnboardingAnswers, options: GenerateOptions): WeekPlan {
  const studyDays = studyDaysFor(answers.daysPerWeek);
  const { count: perDay, minutes } = blocksFor(answers.dailyMinutes);
  const weights = subjectWeights(answers);
  const counts = allocateSessions(studyDays.length * perDay, studyDays.length, weights, options.coverage);
  const placement = placeOnDays(counts, studyDays, perDay);

  // Gera os passos de cada matéria e consome na ordem cronológica da semana.
  const queues = new Map<SubjectId, Step[]>();
  for (const [subjectId, n] of counts) {
    if (n > 0) queues.set(subjectId, sessionSteps(subjectId, n, answers.level, answers.difficulties.includes(subjectId)));
  }

  const activities: Activity[] = [];
  for (const day of studyDays) {
    for (const subjectId of orderDay(placement.get(day)!, answers.difficulties)) {
      const step = queues.get(subjectId)!.shift()!;
      const subject = getSubject(subjectId);
      const topicIndex = (options.topicCursor[subjectId] ?? 0) + step.offset;
      activities.push({
        id: newId(),
        subjectId,
        topic: subject.topics[topicIndex % subject.topics.length],
        topicIndex,
        type: step.type,
        minutes,
        day,
        done: false,
      });
    }
  }

  return { weekStart: options.weekStart, studyDays, blockMinutes: minutes, activities };
}

/**
 * Avança o cursor de tópicos com base no que foi efetivamente estudado na semana.
 * Tópicos não iniciados voltam a aparecer na semana seguinte.
 */
export function advanceCursor(
  plan: WeekPlan,
  cursor: Partial<Record<SubjectId, number>>,
): Partial<Record<SubjectId, number>> {
  const next = { ...cursor };
  const studied = new Map<SubjectId, Set<number>>();
  for (const a of plan.activities) {
    if (!a.done || a.type === 'Revisão') continue;
    if (!studied.has(a.subjectId)) studied.set(a.subjectId, new Set());
    studied.get(a.subjectId)!.add(a.topicIndex);
  }
  for (const [subjectId, topics] of studied) {
    next[subjectId] = Math.max(next[subjectId] ?? 0, Math.max(...topics) + 1);
  }
  return next;
}

export function addCoverage(
  plan: WeekPlan,
  coverage: Partial<Record<SubjectId, number>>,
): Partial<Record<SubjectId, number>> {
  const next = { ...coverage };
  for (const a of plan.activities) next[a.subjectId] = (next[a.subjectId] ?? 0) + 1;
  return next;
}
