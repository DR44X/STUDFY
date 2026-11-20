import type { SubjectId } from './subjects';

export type Goal = 'medicina' | 'publica' | 'bolsa' | 'nota';
export type Level = 'iniciante' | 'intermediario' | 'avancado';

export interface OnboardingAnswers {
  goal: Goal;
  dailyMinutes: number;
  difficulties: SubjectId[];
  level: Level;
  daysPerWeek: number;
}

export interface Option<T> {
  value: T;
  label: string;
  description?: string;
}

export const GOAL_OPTIONS: Option<Goal>[] = [
  { value: 'medicina', label: 'Medicina ou curso concorrido', description: 'Preciso de uma nota muito alta' },
  { value: 'publica', label: 'Entrar em uma universidade pública', description: 'Pelo SiSU, com boa nota geral' },
  { value: 'bolsa', label: 'Conseguir bolsa ou financiamento', description: 'ProUni ou FIES' },
  { value: 'nota', label: 'Melhorar minha nota', description: 'Evoluir em relação ao último resultado' },
];

export const TIME_OPTIONS: Option<number>[] = [
  { value: 30, label: '30 minutos', description: 'Rotina bem corrida' },
  { value: 60, label: '1 hora', description: 'Um bloco por dia' },
  { value: 120, label: '2 horas', description: 'Ritmo equilibrado' },
  { value: 180, label: '3 horas', description: 'Dedicação forte' },
  { value: 240, label: '4 horas ou mais', description: 'Foco total no ENEM' },
];

export const LEVEL_OPTIONS: Option<Level>[] = [
  { value: 'iniciante', label: 'Iniciante', description: 'Estou começando ou retomando os estudos' },
  { value: 'intermediario', label: 'Intermediário', description: 'Conheço boa parte dos conteúdos' },
  { value: 'avancado', label: 'Avançado', description: 'Quero praticar e revisar' },
];

export const DAYS_OPTIONS: Option<number>[] = [3, 4, 5, 6, 7].map((n) => ({
  value: n,
  label: `${n} dias`,
}));

export const MAX_DIFFICULTIES = 4;

export function labelFor<T>(options: Option<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? '';
}
