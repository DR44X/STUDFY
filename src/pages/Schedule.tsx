import { useState, type DragEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { ActivityItem } from '../components/ActivityItem';
import { ProgressBar } from '../components/Progress';
import { getSubject, isSubjectId, type SubjectId } from '../data/subjects';
import {
  WEEKDAYS,
  WEEKDAYS_SHORT,
  addDays,
  formatDayMonth,
  formatMinutes,
  fromISODate,
  weekdayIndex,
} from '../lib/dates';
import { activitiesOfDay, subjectsInPlan, totals } from '../lib/progress';
import { useStudy } from '../lib/study';

export default function Schedule() {
  const { data, toggleActivity, moveActivity } = useStudy();
  const [searchParams, setSearchParams] = useSearchParams();
  const plan = data.plan;

  const todayIdx = weekdayIndex(new Date());
  const dayParam = Number(searchParams.get('dia'));
  const initialDay = Number.isInteger(dayParam) && dayParam >= 0 && dayParam <= 6 && searchParams.has('dia') ? dayParam : todayIdx;

  const [selectedDay, setSelectedDay] = useState<number>(initialDay);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  if (!plan) return null;

  const rawSubject = searchParams.get('materia');
  const activeSubject: SubjectId | null = isSubjectId(rawSubject) ? rawSubject : null;

  const weekStart = fromISODate(plan.weekStart);
  const weekEnd = addDays(weekStart, 6);
  const weekTotals = totals(plan.activities);
  const subjects = subjectsInPlan(plan);

  const setSubjectFilter = (id: SubjectId | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('materia', id);
    else next.delete('materia');
    setSearchParams(next, { replace: true });
  };

  const handleDragStart = (id: string) => (e: DragEvent<HTMLElement>) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverDay(null);
  };

  const handleDayDragOver = (day: number) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDay !== day) setDragOverDay(day);
  };

  const handleDayDrop = (day: number) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData('text/plain');
    if (id) {
      const targetCount = activitiesOfDay(plan, day).length;
      moveActivity(id, day, targetCount);
    }
    setDragId(null);
    setDragOverDay(null);
  };

  const renderDayActivities = (day: number, variant: 'board' | 'list') => {
    const allInDay = activitiesOfDay(plan, day);
    const visible = activeSubject ? allInDay.filter((a) => a.subjectId === activeSubject) : allInDay;

    if (visible.length === 0) {
      return (
        <div className="day-empty">
          {activeSubject ? 'Nenhuma atividade desta matéria.' : 'Dia livre'}
        </div>
      );
    }

    return (
      <div className={variant === 'board' ? 'day-cards' : 'activity-list'}>
        {visible.map((activity) => {
          const idx = allInDay.indexOf(activity);
          return (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onToggle={toggleActivity}
              variant={variant}
              reorder={{
                canMoveUp: idx > 0,
                canMoveDown: idx < allInDay.length - 1,
                onMoveUp: () => moveActivity(activity.id, day, idx - 1),
                onMoveDown: () => moveActivity(activity.id, day, idx + 1),
                onMoveToDay: (toDay) => {
                  const destLen = activitiesOfDay(plan, toDay).length;
                  moveActivity(activity.id, toDay, destLen);
                },
                onDragStart: handleDragStart(activity.id),
                onDragEnd: handleDragEnd,
                dragging: dragId === activity.id,
              }}
            />
          );
        })}
      </div>
    );
  };

  const selectedDayDate = addDays(weekStart, selectedDay);
  const selectedDayTotals = totals(activitiesOfDay(plan, selectedDay));

  return (
    <div className="sched">
      <header className="page-head">
        <div>
          <p className="page-date">
            {formatDayMonth(weekStart)} – {formatDayMonth(weekEnd)}
          </p>
          <h1>Cronograma semanal</h1>
        </div>
        <Link to="/onboarding" className="btn btn-secondary btn-sm">
          <SlidersHorizontal size={16} /> Ajustar preferências
        </Link>
      </header>

      {/* Progresso do planejamento */}
      <section className="card sched-progress" aria-label="Progresso do planejamento">
        <div className="sched-progress-top">
          <div>
            <strong>
              {weekTotals.done} de {weekTotals.total} atividades concluídas
            </strong>
            <span>
              {formatMinutes(weekTotals.minutesDone)} de {formatMinutes(weekTotals.minutesTotal)} na semana
            </span>
          </div>
          <span className="sched-pct">{weekTotals.percent}%</span>
        </div>
        <ProgressBar value={weekTotals.percent} label={`Progresso semanal: ${weekTotals.percent}%`} />
      </section>

      {/* Filtro por matéria */}
      <div className="sched-filters" role="group" aria-label="Filtrar por matéria">
        <button
          type="button"
          className={`filter-chip${activeSubject === null ? ' is-active' : ''}`}
          aria-pressed={activeSubject === null}
          onClick={() => setSubjectFilter(null)}
        >
          Todas
        </button>
        {subjects.map(({ subjectId }) => {
          const subject = getSubject(subjectId);
          const active = activeSubject === subjectId;
          return (
            <button
              key={subjectId}
              type="button"
              className={`filter-chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              data-area={subject.area}
              onClick={() => setSubjectFilter(active ? null : subjectId)}
            >
              <span className="dot" style={{ background: active ? '#fff' : 'var(--area)' }} />
              {subject.name}
            </button>
          );
        })}
        {activeSubject && (
          <button
            type="button"
            className="filter-clear"
            onClick={() => setSubjectFilter(null)}
            aria-label="Limpar filtro de matéria"
          >
            <X size={14} /> Limpar
          </button>
        )}
      </div>

      {/* Visão desktop/tablet largo: quadro semanal */}
      <section className="sched-board" aria-label="Atividades da semana">
        {WEEKDAYS.map((name, dayIdx) => {
          const dayDate = addDays(weekStart, dayIdx);
          const dayActs = activitiesOfDay(plan, dayIdx);
          const dayT = totals(dayActs);
          const isToday = dayIdx === todayIdx;
          const isDropTarget = dragOverDay === dayIdx;

          return (
            <div
              key={name}
              className={`day-col${isToday ? ' is-today' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
              onDragOver={handleDayDragOver(dayIdx)}
              onDragLeave={() => setDragOverDay((d) => (d === dayIdx ? null : d))}
              onDrop={handleDayDrop(dayIdx)}
            >
              <header className="day-col-head">
                <div className="day-col-title">
                  <strong>{WEEKDAYS_SHORT[dayIdx]}</strong>
                  <span>{dayDate.getDate()}</span>
                </div>
                {dayT.total > 0 && (
                  <span className="day-col-count">
                    {dayT.done}/{dayT.total}
                  </span>
                )}
              </header>
              <div className="day-col-body">{renderDayActivities(dayIdx, 'board')}</div>
            </div>
          );
        })}
      </section>

      {/* Visão celular / tablet estreito: seletor de dias + lista confortável */}
      <section className="sched-mobile" aria-label="Atividades por dia">
        <div className="day-tabs" role="tablist" aria-label="Dias da semana">
          {WEEKDAYS_SHORT.map((label, dayIdx) => {
            const dayDate = addDays(weekStart, dayIdx);
            const dayActs = activitiesOfDay(plan, dayIdx);
            const filteredCount = activeSubject
              ? dayActs.filter((a) => a.subjectId === activeSubject).length
              : dayActs.length;
            const isSelected = dayIdx === selectedDay;
            const isToday = dayIdx === todayIdx;

            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`day-tab${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                onClick={() => setSelectedDay(dayIdx)}
              >
                <span className="day-tab-name">{label}</span>
                <strong className="day-tab-num">{dayDate.getDate()}</strong>
                <span className={`day-tab-dot${filteredCount > 0 ? ' has-items' : ''}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="card sched-mobile-panel" role="tabpanel">
          <div className="section-head">
            <div>
              <h2>
                {WEEKDAYS[selectedDay]}, {formatDayMonth(selectedDayDate)}
              </h2>
              <p className="section-sub">
                {selectedDayTotals.total === 0
                  ? 'Dia livre no seu planejamento'
                  : `${selectedDayTotals.done} de ${selectedDayTotals.total} concluídas · ${formatMinutes(selectedDayTotals.minutesTotal)}`}
              </p>
            </div>
          </div>
          {renderDayActivities(selectedDay, 'list')}
        </div>
      </section>
    </div>
  );
}
