import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Flame, Sparkles } from 'lucide-react';
import { ActivityItem } from '../components/ActivityItem';
import { ProgressBar, ProgressRing } from '../components/Progress';
import { getSubject } from '../data/subjects';
import { getDisplayName, useAuth } from '../lib/auth';
import { WEEKDAYS, WEEKDAYS_SHORT, formatLongDate, formatMinutes, weekdayIndex } from '../lib/dates';
import { activitiesOfDay, computeStreak, firstName, greeting, subjectsInPlan, totals } from '../lib/progress';
import { useStudy } from '../lib/study';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { data, loading: studyLoading, toggleActivity } = useStudy();
  const plan = data.plan;

  if (!user) return null;

  if (studyLoading && !plan) {
    return (
      <div className="page-loading page-loading-inline" role="status" aria-live="polite" aria-label="Carregando seu plano de estudos">
        <span className="spinner spinner-brand" aria-hidden="true" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="card dash-section">
        <div className="empty-box">
          <Sparkles size={22} />
          <h3>Configure seu plano de estudos</h3>
          <p>Responda rapidamente às perguntas iniciais para montarmos seu cronograma semanal personalizado.</p>
          <Link to="/onboarding?editar=1" className="btn btn-primary btn-sm">
            Configurar plano
          </Link>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName(profile, user);
  const today = new Date();
  const todayIdx = weekdayIndex(today);
  const todayActivities = activitiesOfDay(plan, todayIdx);
  const todayTotals = totals(todayActivities);
  const weekTotals = totals(plan.activities);
  const streak = computeStreak(data.studyLog, plan.studyDays, user.created_at);
  const subjects = subjectsInPlan(plan);

  const upcoming = plan.activities
    .filter((a) => a.day > todayIdx && !a.done)
    .sort((a, b) => a.day - b.day)
    .slice(0, 4);

  const isRestDay = todayActivities.length === 0;
  const allTodayDone = todayActivities.length > 0 && todayTotals.done === todayTotals.total;

  return (
    <div className="dash">
      <header className="page-head">
        <div>
          <p className="page-date">{formatLongDate(today)}</p>
          <h1>
            {greeting(today)}, {firstName(displayName)}
          </h1>
        </div>
        <Link to="/cronograma" className="btn btn-secondary btn-sm">
          <CalendarDays size={16} /> Ver cronograma
        </Link>
      </header>

      {/* Resumo dos estudos */}
      <section className="dash-stats" aria-label="Resumo dos estudos">
        <div className="card stat-card stat-streak">
          <div className="stat-icon stat-icon-streak">
            <Flame size={20} />
          </div>
          <div>
            <span className="stat-label">Sequência</span>
            <strong className="stat-value">
              {streak} {streak === 1 ? 'dia' : 'dias'}
            </strong>
            <span className="stat-sub">
              {streak > 0 ? 'Continue assim!' : 'Conclua uma atividade hoje'}
            </span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="stat-label">Concluídas na semana</span>
            <strong className="stat-value">
              {weekTotals.done} <span>de {weekTotals.total}</span>
            </strong>
            <span className="stat-sub">{weekTotals.percent}% do planejamento</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon">
            <Clock size={20} />
          </div>
          <div>
            <span className="stat-label">Tempo estudado</span>
            <strong className="stat-value">{formatMinutes(weekTotals.minutesDone)}</strong>
            <span className="stat-sub">de {formatMinutes(weekTotals.minutesTotal)} previstos</span>
          </div>
        </div>
      </section>

      <div className="dash-grid">
        {/* Coluna principal: atividades de hoje + próximas atividades */}
        <div className="dash-primary">
          <section className="card dash-section" aria-labelledby="today-heading">
            <div className="section-head">
              <div>
                <h2 id="today-heading">Atividades de hoje</h2>
                <p className="section-sub">
                  {isRestDay
                    ? 'Dia livre no seu planejamento'
                    : `${todayTotals.done} de ${todayTotals.total} concluídas · ${formatMinutes(todayTotals.minutesTotal)}`}
                </p>
              </div>
              {!isRestDay && (
                <span className={`tag${allTodayDone ? ' tag-success' : ''}`}>
                  {allTodayDone ? 'Concluído' : `${todayTotals.percent}%`}
                </span>
              )}
            </div>

            {isRestDay ? (
              <div className="empty-box">
                <Sparkles size={22} />
                <h3>Dia de descanso</h3>
                <p>Você não tem atividades programadas para hoje. Aproveite para descansar ou adiante algo no cronograma.</p>
                <Link to="/cronograma" className="btn btn-secondary btn-sm">
                  Abrir cronograma
                </Link>
              </div>
            ) : (
              <div className="activity-list">
                {todayActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} onToggle={toggleActivity} />
                ))}
              </div>
            )}
          </section>

          <section className="card dash-section" aria-labelledby="upcoming-heading">
            <div className="section-head">
              <div>
                <h2 id="upcoming-heading">Próximas atividades</h2>
                <p className="section-sub">O que vem a seguir nesta semana</p>
              </div>
              <Link to="/cronograma" className="section-link">
                Semana completa <ArrowRight size={15} />
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <p className="empty-inline">Nenhuma atividade pendente para os próximos dias desta semana.</p>
            ) : (
              <div className="activity-list">
                {upcoming.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    onToggle={toggleActivity}
                    eyebrow={WEEKDAYS[activity.day]}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Coluna secundária: progresso semanal + matérias */}
        <div className="dash-secondary">
          <section className="card dash-section" aria-labelledby="week-heading">
            <div className="section-head">
              <div>
                <h2 id="week-heading">Progresso semanal</h2>
                <p className="section-sub">Distribuição dos seus estudos</p>
              </div>
            </div>

            <div className="week-overview">
              <ProgressRing value={weekTotals.percent} size={88} stroke={8} />
              <div className="week-overview-meta">
                <strong>
                  {weekTotals.done} de {weekTotals.total} sessões
                </strong>
                <span>
                  {formatMinutes(weekTotals.minutesDone)} de {formatMinutes(weekTotals.minutesTotal)}
                </span>
              </div>
            </div>

            <div className="week-bars" aria-label="Progresso por dia da semana">
              {WEEKDAYS_SHORT.map((label, dayIdx) => {
                const dayActs = activitiesOfDay(plan, dayIdx);
                const dayT = totals(dayActs);
                const isToday = dayIdx === todayIdx;
                const isEmpty = dayActs.length === 0;
                return (
                  <Link
                    key={label}
                    to={`/cronograma?dia=${dayIdx}`}
                    className={`week-bar-col${isToday ? ' is-today' : ''}${isEmpty ? ' is-rest' : ''}`}
                    title={
                      isEmpty
                        ? `${WEEKDAYS[dayIdx]}: dia livre`
                        : `${WEEKDAYS[dayIdx]}: ${dayT.done} de ${dayT.total} concluídas`
                    }
                  >
                    <div className="week-bar-track">
                      <div
                        className="week-bar-fill"
                        style={{ height: isEmpty ? '0%' : `${Math.max(dayT.percent, dayT.done > 0 ? 18 : 0)}%` }}
                      />
                    </div>
                    <span className="week-bar-label">{label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="card dash-section" aria-labelledby="subjects-heading">
            <div className="section-head">
              <div>
                <h2 id="subjects-heading">Suas matérias</h2>
                <p className="section-sub">Toque para filtrar no cronograma</p>
              </div>
            </div>

            <div className="subject-list">
              {subjects.map(({ subjectId, totals: t }) => {
                const subject = getSubject(subjectId);
                return (
                  <Link
                    key={subjectId}
                    to={`/cronograma?materia=${subjectId}`}
                    className="subject-row"
                    data-area={subject.area}
                  >
                    <div className="subject-row-top">
                      <span className="subject-row-name">
                        <span className="dot" style={{ background: 'var(--area)' }} />
                        {subject.name}
                      </span>
                      <span className="subject-row-count">
                        {t.done}/{t.total}
                      </span>
                    </div>
                    <ProgressBar value={t.percent} label={`${subject.name}: ${t.percent}%`} />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
