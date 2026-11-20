import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { callAdminApi, type AdminConfigRow } from '../../lib/adminApi';
import { useAuth } from '../../lib/auth';
import { Button } from '../Button';

export function AdminSettings() {
  const { user } = useAuth();
  const [logAuthEvents, setLogAuthEvents] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAdminApi<{ config: AdminConfigRow | null }>('get_admin_config');
      if (res.config) {
        setLogAuthEvents(res.config.log_auth_events);
        setAdminNotes(res.config.admin_notes);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao carregar configurações.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await callAdminApi<{ config: AdminConfigRow }>('update_admin_config', {
        config: {
          log_auth_events: logAuthEvents,
          admin_notes: adminNotes,
        },
      });
      setLogAuthEvents(res.config.log_auth_events);
      setAdminNotes(res.config.admin_notes);
      setFeedback({ type: 'success', text: 'Configurações administrativas salvas.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-section">
      <div className="adm-section-bar">
        <div>
          <h2>Configurações administrativas</h2>
          <p className="section-sub">Políticas internas de auditoria, segurança e governança de dados.</p>
        </div>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} role="status">
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {loading ? (
        <div className="page-loading page-loading-inline" role="status">
          <span className="spinner spinner-brand" aria-hidden="true" />
        </div>
      ) : (
        <form className="adm-form-stack" onSubmit={handleSave}>
          <section className="card dash-section">
            <div className="section-head">
              <div>
                <h3>Registro de acessos e notas internas</h3>
                <p className="section-sub">Armazenado em tabela restrita exclusivamente a administradores.</p>
              </div>
              <ShieldCheck size={18} className="profile-section-icon" aria-hidden="true" />
            </div>

            <div className="adm-form-stack">
              <label className="adm-checkbox">
                <input type="checkbox" checked={logAuthEvents} onChange={(e) => setLogAuthEvents(e.target.checked)} />
                <span>Registrar eventos de autenticação (logins, falhas, logouts e solicitações de senha)</span>
              </label>

              <div className="field">
                <label className="field-label" htmlFor="adm-internal-notes">
                  Notas internas da administração
                </label>
                <textarea
                  id="adm-internal-notes"
                  className="input adm-textarea"
                  rows={4}
                  placeholder="Registre observações operacionais sobre a plataforma..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              <div className="profile-form-actions">
                <Button type="submit" loading={saving} disabled={saving}>
                  Salvar configurações
                </Button>
              </div>
            </div>
          </section>

          <section className="card dash-section">
            <div className="section-head">
              <div>
                <h3>Política de segurança e exclusão de contas</h3>
                <p className="section-sub">Controles ativos no backend do Studfy</p>
              </div>
              <Lock size={18} className="profile-section-icon" aria-hidden="true" />
            </div>

            <ul className="adm-policy-list">
              <li>
                <strong>Administrador ativo:</strong> {user?.email} (validado por <code>app_metadata.role</code> e{' '}
                <code>profiles.role</code> no servidor).
              </li>
              <li>
                <strong>Proteção contra auto-promoção:</strong> trigger <code>profiles_protect_role</code> bloqueia alteração de{' '}
                <code>role</code> ou <code>status</code> pelo cliente.
              </li>
              <li>
                <strong>Exclusão permanente desabilitada:</strong> contas devem ser suspensas para preservar integridade referencial de{' '}
                <code>admin_audit_logs</code>, <code>study_plans</code> e histórico de estudos até definição de fluxo de anonimização.
              </li>
            </ul>
          </section>
        </form>
      )}
    </div>
  );
}
