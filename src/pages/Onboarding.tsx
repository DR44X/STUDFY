import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock, CalendarDays, Target, Layers, LogOut } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/Progress';
import {
  DAYS_OPTIONS,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  MAX_DIFFICULTIES,
  TIME_OPTIONS,
  labelFor,
  type Goal,
  type Level,
  type Option,
} from '../data/onboarding';
import { SUBJECTS, getSubject, type SubjectId } from '../data/subjects';
import { useAuth } from '../lib/auth';
import { useStudy } from '../lib/study';
import { blocksFor, studyDaysFor } from '../lib/schedule';
import { WEEKDAYS_SHORT, formatMinutes } from '../lib/dates';
import { firstName } from '../lib/progress';
import '../styles/onboarding.css';

interface Draft {
  goal?: Goal;
  dailyMinutes?: number;
  difficulties: SubjectId[];
  level?: Level;
  daysPerWeek?: number;
}

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const { user, logout } = useAuth();
  const { data, saveOnboarding } = useStudy();
  const navigate = useNavigate();
  const editing = Boolean(data.onboarding);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => data.onboarding ?? { difficulties: [] });

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  /** Perguntas de escolha única avançam sozinhas após a seleção. */
  function choose<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    window.setTimeout(next, 220);
  }

  const toggleDifficulty = (id: SubjectId) =>
    setDraft((d) => {
      if (d.difficulties.includes(id)) return { ...d, difficulties: d.difficulties.filter((x) => x !== id) };
      if (d.difficulties.length >= MAX_DIFFICULTIES) return d;
      return { ...d, difficulties: [...d.difficulties, id] };
    });

  const finish = () => {
    if (!draft.goal || !draft.dailyMinutes || !draft.level || !draft.daysPerWeek) return;
    saveOnboarding({
      goal: draft.goal,
      dailyMinutes: draft.dailyMinutes,
      difficulties: draft.difficulties,
      level: draft.level,
      daysPerWeek: draft.daysPerWeek,
    });
    navigate('/cronograma', { replace: true });
  };

  const isSummary = step === TOTAL_STEPS;

  return (
    <div className="ob">
      <header className="ob-header">
        <Logo to={editing ? '/painel' : '/'} size="sm" />
        {editing ? (
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut size={16} /> Sair
          </Button>
        )}
      </header>

      <div className="ob-progress">
        <ProgressBar value={((isSummary ? TOTAL_STEPS : step) / TOTAL_STEPS) * 100} label="Progresso da personalização" />
      </div>

      <main className="ob-main">
        <div className="ob-card" key={step}>
          {!isSummary && (
            <div className="ob-step-top">
              {step > 0 ? (
                <button type="button" className="ob-back" onClick={back}>
                  <ArrowLeft size={16} /> Voltar
                </button>
              ) : (
                <span />
              )}
              <span className="ob-count">
                {step + 1} de {TOTAL_STEPS}
              </span>
            </div>
          )}

          {step === 0 && (
            <Question
              title={editing ? 'Qual é seu objetivo?' : `Olá, ${firstName(user?.name ?? '')}! Qual é seu objetivo?`}
              subtitle="Isso ajuda a definir onde colocar mais energia."
            >
              <Choices options={GOAL_OPTIONS} value={draft.goal} onChoose={(v) => choose('goal', v)} />
            </Question>
          )}

          {step === 1 && (
            <Question title="Quanto tempo você tem para estudar por dia?" subtitle="Seja realista: constância vale mais do que intensidade.">
              <Choices options={TIME_OPTIONS} value={draft.dailyMinutes} onChoose={(v) => choose('dailyMinutes', v)} />
            </Question>
          )}

          {step === 2 && (
            <Question
              title="Quais matérias são mais difíceis para você?"
              subtitle={`Escolha até ${MAX_DIFFICULTIES}. Elas terão mais espaço no seu cronograma.`}
            >
              <div className="ob-chips" role="group" aria-label="Matérias com dificuldade">
                {SUBJECTS.map((s) => {
                  const selected = draft.difficulties.includes(s.id);
                  const blocked = !selected && draft.difficulties.length >= MAX_DIFFICULTIES;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`ob-chip${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      disabled={blocked}
                      data-area={s.area}
                      onClick={() => toggleDifficulty(s.id)}
                    >
                      {selected ? <Check size={15} strokeWidth={2.75} /> : <span className="dot" style={{ background: 'var(--area)' }} />}
                      {s.name}
                    </button>
                  );
                })}
              </div>
              <div className="ob-actions">
                <span className="ob-hint">
                  {draft.difficulties.length === 0
                    ? 'Nenhuma selecionada: o tempo será dividido de forma equilibrada.'
                    : `${draft.difficulties.length} de ${MAX_DIFFICULTIES} selecionadas`}
                </span>
                <Button onClick={next}>
                  Continuar <ArrowRight size={16} />
                </Button>
              </div>
            </Question>
          )}

          {step === 3 && (
            <Question title="Como você avalia seu nível de conhecimento?" subtitle="Define o equilíbrio entre teoria, exercícios e revisão.">
              <Choices options={LEVEL_OPTIONS} value={draft.level} onChoose={(v) => choose('level', v)} />
            </Question>
          )}

          {step === 4 && (
            <Question title="Quantos dias por semana você pretende estudar?" subtitle="Os outros dias ficam livres para descanso.">
              <div className="ob-days">
                {DAYS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`ob-day${draft.daysPerWeek === o.value ? ' is-selected' : ''}`}
                    aria-pressed={draft.daysPerWeek === o.value}
                    aria-label={o.label}
                    onClick={() => choose('daysPerWeek', o.value)}
                  >
                    <strong>{o.value}</strong>
                    <span>dias</span>
                  </button>
                ))}
              </div>
            </Question>
          )}

          {isSummary && <Summary draft={draft} editing={editing} onBack={back} onFinish={finish} />}
        </div>
      </main>
    </div>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="ob-question">
      <h1>{title}</h1>
      <p className="ob-subtitle">{subtitle}</p>
      <div className="ob-answers">{children}</div>
    </section>
  );
}

function Choices<T>({ options, value, onChoose }: { options: Option<T>[]; value: T | undefined; onChoose: (v: T) => void }) {
  return (
    <div className="ob-options">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            className={`ob-option${selected ? ' is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onChoose(o.value)}
          >
            <span className="ob-option-text">
              <strong>{o.label}</strong>
              {o.description && <span>{o.description}</span>}
            </span>
            <span className="ob-radio" aria-hidden="true">
              {selected && <Check size={13} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Summary({ draft, editing, onBack, onFinish }: { draft: Draft; editing: boolean; onBack: () => void; onFinish: () => void }) {
  const days = studyDaysFor(draft.daysPerWeek ?? 5);
  const blocks = blocksFor(draft.dailyMinutes ?? 60);
  const weekly = days.length * blocks.count * blocks.minutes;

  return (
    <section className="ob-question ob-summary">
      <span className="ob-summary-icon">
        <Check size={26} strokeWidth={2.5} />
      </span>
      <h1>{editing ? 'Tudo certo para atualizar' : 'Seu plano está pronto'}</h1>
      <p className="ob-subtitle">
        {editing
          ? 'Um novo cronograma será montado para esta semana. Sua sequência de estudos será mantida.'
          : 'Montamos um cronograma semanal com base nas suas respostas.'}
      </p>

      <dl className="ob-summary-list">
        <div>
          <dt>
            <Target size={16} /> Objetivo
          </dt>
          <dd>{labelFor(GOAL_OPTIONS, draft.goal)}</dd>
        </div>
        <div>
          <dt>
            <Clock size={16} /> Por semana
          </dt>
          <dd>
            {formatMinutes(weekly)} · {days.length * blocks.count} sessões de {blocks.minutes} min
          </dd>
        </div>
        <div>
          <dt>
            <CalendarDays size={16} /> Dias de estudo
          </dt>
          <dd>{days.map((d) => WEEKDAYS_SHORT[d]).join(', ')}</dd>
        </div>
        <div>
          <dt>
            <Layers size={16} /> Foco extra
          </dt>
          <dd>{draft.difficulties.length ? draft.difficulties.map((id) => getSubject(id).name).join(', ') : 'Distribuição equilibrada'}</dd>
        </div>
      </dl>

      <div className="ob-actions ob-actions-final">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Revisar
        </Button>
        <Button size="lg" onClick={onFinish}>
          {editing ? 'Atualizar cronograma' : 'Ver meu cronograma'} <ArrowRight size={18} />
        </Button>
      </div>
    </section>
  );
}
