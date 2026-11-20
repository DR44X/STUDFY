import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '../Button';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  loading = false,
  children,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [loading, onCancel, open]);

  if (!open) return null;

  return (
    <div className="adm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="adm-confirm-title">
      <div className="card adm-modal">
        <div className="adm-modal-head">
          <div className={`adm-modal-icon${danger ? ' is-danger' : ''}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 id="adm-confirm-title">{title}</h3>
            <p>{description}</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Fechar confirmação" disabled={loading} onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        {children && <div className="adm-modal-body">{children}</div>}

        <div className="adm-modal-actions">
          <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={danger ? 'secondary' : 'primary'}
            className={danger ? 'adm-btn-danger' : undefined}
            loading={loading}
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
