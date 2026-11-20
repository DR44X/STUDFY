import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ArrowDown, ArrowUp, CalendarDays, Check, Clock, GripVertical, MoreHorizontal } from 'lucide-react';
import { getSubject } from '../data/subjects';
import { WEEKDAYS, formatMinutes } from '../lib/dates';
import type { Activity } from '../lib/schedule';

interface ActivityItemProps {
  activity: Activity;
  onToggle: (id: string) => void;
  /** Rótulo opcional exibido acima da matéria (ex.: dia da semana). */
  eyebrow?: string;
  variant?: 'list' | 'board';
  reorder?: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onMoveToDay: (day: number) => void;
    onDragStart: (e: DragEvent<HTMLElement>) => void;
    onDragEnd: () => void;
    dragging: boolean;
  };
}

export function ActivityItem({ activity, onToggle, eyebrow, variant = 'list', reorder }: ActivityItemProps) {
  const subject = getSubject(activity.subjectId);
  const label = `${subject.name}: ${activity.topic}`;

  return (
    <article
      className={`activity activity-${variant}${activity.done ? ' is-done' : ''}${reorder?.dragging ? ' is-dragging' : ''}`}
      data-area={subject.area}
      draggable={reorder ? true : undefined}
      onDragStart={reorder?.onDragStart}
      onDragEnd={reorder?.onDragEnd}
    >
      {reorder && (
        <span className="activity-grip" aria-hidden="true">
          <GripVertical size={15} />
        </span>
      )}
      <button
        type="button"
        className="check"
        role="checkbox"
        aria-checked={activity.done}
        aria-label={`${activity.done ? 'Desmarcar' : 'Marcar como concluída'}: ${label}`}
        onClick={() => onToggle(activity.id)}
      >
        <Check size={14} strokeWidth={3} />
      </button>
      <div className="activity-body">
        <div className="activity-top-row">
          <span className="activity-subject-pill">
            <span className="dot" style={{ background: 'var(--area)' }} />
            {subject.name}
          </span>
          {eyebrow && <span className="activity-eyebrow">{eyebrow}</span>}
        </div>
        <p className="activity-topic">{activity.topic}</p>
        <div className="activity-meta">
          <span className="activity-type-badge">{activity.type}</span>
          <span className="activity-time">
            <Clock size={12} aria-hidden="true" />
            {formatMinutes(activity.minutes)}
          </span>
          {activity.done && <span className="activity-done-pill">Concluída</span>}
        </div>
      </div>
      {reorder && <MoveMenu activity={activity} label={label} {...reorder} />}
    </article>
  );
}

function MoveMenu({
  activity,
  label,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onMoveToDay,
}: { activity: Activity; label: string } & NonNullable<ActivityItemProps['reorder']>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="icon-btn activity-menu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Reorganizar: ${label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="menu-panel" role="menu">
          <button type="button" role="menuitem" disabled={!canMoveUp} onClick={() => run(onMoveUp)}>
            <ArrowUp size={15} /> Mover para cima
          </button>
          <button type="button" role="menuitem" disabled={!canMoveDown} onClick={() => run(onMoveDown)}>
            <ArrowDown size={15} /> Mover para baixo
          </button>
          <div className="menu-sep" role="separator" />
          <span className="menu-title">
            <CalendarDays size={13} /> Mover para outro dia
          </span>
          <div className="menu-days">
            {WEEKDAYS.map((name, day) => (
              <button
                key={name}
                type="button"
                role="menuitem"
                disabled={day === activity.day}
                onClick={() => run(() => onMoveToDay(day))}
                aria-label={`Mover para ${name}`}
              >
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
