import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { callAdminApi, type AdminActiveSession, type AdminAuthEvent } from '../../lib/adminApi';
import { Button } from '../Button';
import { ConfirmModal } from './ConfirmModal';

const EVENT_LABELS: Record<string, string> = {
  login_success: 'Login realizado',
  login_failed: 'Falha de login',
  logout: 'Logout',
  signup: 'Novo cadastro',
  password_reset_request: 'Solicitação de senha',
  password_updated: 'Senha atualizada',
  session_revoked: 'Sessão encerrada',
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function shortenUA(ua: string | null): string {
  if (!ua) return 'Dispositivo não identificado';
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome/')) return 'Google Chrome';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  return ua.slice(0, 48);
}

export function AdminSessions() {
  const [sessions, setSessions] = useState<AdminActiveSession[]>([]);
  const [events, setEvents] = useState<AdminAuthEvent[]>([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<
    | { type: 'session'; id: string; label: string }
    | { type: 'user'; id: string; label: string }
    | null
  >(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await callAdminApi<{ sessions: AdminActiveSession[]; events: AdminAuthEvent[] }>(
        'list_sessions_and_events',
        { eventType: eventFilter },
      );
      setSessions(res.sessions);
      setEvents(res.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar sessões e eventos.');
    } finally {
      setLoading(false);
    }
  }, [eventFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConfirm = async () => {
    if (!confirmTarget || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      if (confirmTarget.type === 'session') {
        await callAdminApi('revoke_session', { sessionId: confirmTarget.id });
        setFeedback({ type: 'success', text: `Sessão de ${confirmTarget.label} encerrada remotamente.` });
      } else {
        const res = await callAdminApi<{ count: number }>('revoke_user_sessions', { userId: confirmTarget.id });
        setFeedback({ type: 'success', text: `${res.count} sessão(ões) de ${confirmTarget.label} encerrada(s).` });
      }
      setConfirmTarget(null);
      await load();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Falha ao encerrar sessão.' });
      setConfirmTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-section">
      <div className="adm-section-bar">
        <div>
          <h2>Acessos e sessões</h2>
          <p className="section-sub">Sessões reais ativas em auth.sessions e histórico de eventos de autenticação.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" loading={loading} onClick={() => void load()}>
          <RefreshCw size={15} /> Atualizar
        </Button>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} role="status">
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      <section className="card dash-section">
        <div className="section-head">
          <div>
            <h3>Sessões ativas ({sessions.length})</h3>
            <p className="section-sub">Encerre uma sessão específica ou todas as sessões de uma conta.</p>
          </div>
          <KeyRound size={18} className="profile-section-icon" aria-hidden="true" />
        </div>

        {loading && sessions.length === 0 ? (
          <div className="page-loading page-loading-inline" role="status">
            <span className="spinner spinner-brand" aria-hidden="true" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="empty-inline">Nenhuma sessão ativa encontrada.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Navegador / Agente</th>
                  <th>IP</th>
                  <th>Iniciada em</th>
                  <th>Última atividade</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const label = s.email || s.user_id;
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="adm-table-user">
                          <strong>{s.full_name || 'Usuário'}</strong>
                          <span>{s.email ?? s.user_id}</span>
                        </div>
                      </td>
                      <td>{shortenUA(s.user_agent)}</td>
                      <td>{s.ip ?? '—'}</td>
                      <td>{formatDateTime(s.created_at)}</td>
                      <td>{formatDateTime(s.refreshed_at ?? s.updated_at)}</td>
                      <td className="adm-table-actions">
                        <div className="adm-btn-group">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfirmTarget({ type: 'session', id: s.id, label })}
                          >
                            <LogOut size={14} /> Encerrar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmTarget({ type: 'user', id: s.user_id, label })}
                          >
                            Todas da conta
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card dash-section">
        <div className="section-head">
          <div>
            <h3>Eventos de autenticação ({events.length})</h3>
            <p className="section-sub">Logins, logouts, falhas e revogações</p>
          </div>
          <select
            className="input adm-select"
            aria-label="Filtrar eventos"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="all">Todos os eventos</option>
            <option value="login_success">Login realizado</option>
            <option value="login_failed">Falha de login</option>
            <option value="logout">Logout</option>
            <option value="signup">Novo cadastro</option>
            <option value="password_reset_request">Solicitação de senha</option>
            <option value="session_revoked">Sessão encerrada</option>
          </select>
        </div>

        {events.length === 0 ? (
          <div className="empty-box">
            <ShieldAlert size={20} />
            <h3>Nenhum evento registrado</h3>
            <p>Novos eventos de login, logout e tentativas aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Usuário / E-mail</th>
                  <th>Agente</th>
                  <th>Data e hora</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <span
                        className={`tag ${
                          ev.event_type === 'login_failed' || ev.event_type === 'session_revoked'
                            ? 'adm-tag-danger'
                            : ev.event_type === 'login_success'
                              ? 'tag-success'
                              : ''
                        }`}
                      >
                        {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                      </span>
                    </td>
                    <td>
                      <div className="adm-table-user">
                        <strong>{ev.full_name || ev.actor_email || '—'}</strong>
                        {ev.actor_email && ev.full_name && <span>{ev.actor_email}</span>}
                      </div>
                    </td>
                    <td>{shortenUA(ev.user_agent)}</td>
                    <td>{formatDateTime(ev.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        open={Boolean(confirmTarget)}
        title={confirmTarget?.type === 'session' ? 'Encerrar sessão selecionada' : 'Encerrar todas as sessões da conta'}
        description={
          confirmTarget?.type === 'session'
            ? `A sessão ativa de ${confirmTarget.label} será revogada imediatamente.`
            : `Todas as sessões ativas de ${confirmTarget?.label} serão encerradas.`
        }
        confirmLabel="Encerrar"
        danger
        loading={busy}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}
