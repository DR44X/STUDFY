import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, FileClock, RefreshCw } from 'lucide-react';
import { callAdminApi, type AdminAuditLogRow } from '../../lib/adminApi';
import { Button } from '../Button';

const ACTION_LABELS: Record<string, string> = {
  suspend_user: 'Suspensão de conta',
  reactivate_user: 'Reativação de conta',
  revoke_session: 'Encerramento de sessão',
  revoke_user_sessions: 'Encerramento de sessões da conta',
  update_site_settings: 'Alteração de personalização',
  update_features: 'Alteração de funcionalidades',
  update_admin_config: 'Alteração de config. administrativas',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function AdminAudit() {
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [filterAction, setFilterAction] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await callAdminApi<{ logs: AdminAuditLogRow[] }>('get_audit_logs', {
        filterAction,
        outcome,
      });
      setLogs(res.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os logs de auditoria.');
    } finally {
      setLoading(false);
    }
  }, [filterAction, outcome]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="adm-section">
      <div className="adm-section-bar">
        <div>
          <h2>Logs e auditoria</h2>
          <p className="section-sub">Registros imutáveis das operações administrativas realizadas na plataforma.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" loading={loading} onClick={() => void load()}>
          <RefreshCw size={15} /> Atualizar
        </Button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      <section className="card dash-section">
        <div className="section-head">
          <div>
            <h3>Histórico de auditoria ({logs.length})</h3>
            <p className="section-sub">Protegido contra edição ou exclusão no banco de dados.</p>
          </div>
          <div className="adm-btn-group">
            <select className="input adm-select" aria-label="Filtrar por ação" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
              <option value="all">Todas as ações</option>
              {Object.entries(ACTION_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <select className="input adm-select" aria-label="Filtrar por resultado" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="all">Todos resultados</option>
              <option value="success">Sucesso</option>
              <option value="error">Erro</option>
            </select>
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="page-loading page-loading-inline" role="status">
            <span className="spinner spinner-brand" aria-hidden="true" />
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-box">
            <FileClock size={20} />
            <h3>Nenhum registro de auditoria</h3>
            <p>Alterações administrativas aparecerão aqui automaticamente com data, responsável e resultado.</p>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Administrador</th>
                  <th>Ação</th>
                  <th>Alvo</th>
                  <th>Resultado</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.created_at)}</td>
                    <td>{log.admin_email ?? log.admin_user_id}</td>
                    <td>{ACTION_LABELS[log.action] ?? log.action}</td>
                    <td>{log.target_label ?? '—'}</td>
                    <td>
                      <span className={`tag ${log.outcome === 'success' ? 'tag-success' : 'adm-tag-danger'}`}>
                        {log.outcome === 'success' ? 'Sucesso' : 'Erro'}
                      </span>
                    </td>
                    <td>
                      <code className="adm-code-cell">{JSON.stringify(log.details)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
