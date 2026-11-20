import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Database, RefreshCw, ShieldCheck } from 'lucide-react';
import { callAdminApi, type AdminDatabaseOverviewResponse } from '../../lib/adminApi';
import { Button } from '../Button';

const TABLE_LABELS: Record<string, string> = {
  profiles: 'Perfis (profiles)',
  study_preferences: 'Preferências (study_preferences)',
  study_progress: 'Progresso (study_progress)',
  study_plans: 'Cronogramas (study_plans)',
  study_activities: 'Atividades (study_activities)',
  study_logs: 'Histórico diário (study_logs)',
  site_settings: 'Personalização (site_settings)',
  admin_config: 'Config. Admin (admin_config)',
  auth_events: 'Eventos Auth (auth_events)',
  admin_audit_logs: 'Auditoria (admin_audit_logs)',
};

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 80);
  const str = String(val);
  return str.length > 64 ? `${str.slice(0, 64)}…` : str;
}

export function AdminDatabase() {
  const [selectedTable, setSelectedTable] = useState('profiles');
  const [data, setData] = useState<AdminDatabaseOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (table: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await callAdminApi<AdminDatabaseOverviewResponse>('get_database_overview', { table });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível consultar o banco de dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedTable);
  }, [load, selectedTable]);

  const columns = data?.rows[0] ? Object.keys(data.rows[0]) : [];

  return (
    <div className="adm-section">
      <div className="adm-section-bar">
        <div>
          <h2>Banco de dados</h2>
          <p className="section-sub">Visão estruturada e somente leitura das tabelas gerenciadas (RLS ativo em todas).</p>
        </div>
        <Button type="button" variant="secondary" size="sm" loading={loading} onClick={() => void load(selectedTable)}>
          <RefreshCw size={15} /> Atualizar
        </Button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {data && (
        <div className="adm-db-grid">
          {data.tables.map((t) => {
            const active = t.table === selectedTable;
            return (
              <button
                key={t.table}
                type="button"
                className={`card adm-db-card${active ? ' is-selected' : ''}`}
                onClick={() => setSelectedTable(t.table)}
              >
                <div className="adm-db-card-top">
                  <Database size={16} />
                  <span className="tag tag-success">RLS</span>
                </div>
                <strong>{t.rows}</strong>
                <span>{TABLE_LABELS[t.table] ?? t.table}</span>
              </button>
            );
          })}
        </div>
      )}

      <section className="card dash-section">
        <div className="section-head">
          <div>
            <h3>Registros recentes: {TABLE_LABELS[selectedTable] ?? selectedTable}</h3>
            <p className="section-sub">Prévia limitada aos 15 registros mais recentes (sem SQL livre no navegador).</p>
          </div>
          <span className="tag tag-brand">
            <ShieldCheck size={13} /> Consulta controlada
          </span>
        </div>

        {loading && !data ? (
          <div className="page-loading page-loading-inline" role="status">
            <span className="spinner spinner-brand" aria-hidden="true" />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <p className="empty-inline">Nenhum registro encontrado nesta tabela.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table-compact">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, idx) => (
                  <tr key={String(row.id ?? row.user_id ?? idx)}>
                    {columns.map((col) => (
                      <td key={col}>
                        <code className="adm-code-cell">{formatCell(row[col])}</code>
                      </td>
                    ))}
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
