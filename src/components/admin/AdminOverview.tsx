import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { callAdminApi, type AdminOverviewResponse } from '../../lib/adminApi';
import { formatMinutes } from '../../lib/dates';
import { Button } from '../Button';
import { ProgressBar } from '../Progress';

function shortDayLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function AdminOverview() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await callAdminApi<AdminOverviewResponse>('overview');
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os indicadores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="page-loading page-loading-inline" role="status" aria-label="Carregando visão geral">
        <span className="spinner spinner-brand" aria-hidden="true" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="alert alert-error" role="alert">
        <AlertCircle size={18} /> <span>{error}</span>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, featureUsage, series } = data;
  const maxGrowth = Math.max(1, ...series.map((s) => Math.max(s.signups, s.logins)));
  const maxStudy = Math.max(1, ...series.map((s) => s.completedActivities));

  return (
    <div className="adm-section">
      <div className="adm-section-bar">
        <div>
          <h2>Visão geral</h2>
          <p className="section-sub">Indicadores reais em tempo real de usuários, sessões e estudos.</p>
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

      <div className="adm-kpi-grid">
        <div className="card stat-card">
          <div className="stat-icon">
            <Users size={20} />
          </div>
          <div>
            <span className="stat-label">Total de usuários</span>
            <strong className="stat-value">{kpis.totalUsers}</strong>
            <span className="stat-sub">{kpis.activeUsers} ativos · {kpis.suspendedUsers} suspensos</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon">
            <UserPlus size={20} />
          </div>
          <div>
            <span className="stat-label">Novos cadastros</span>
            <strong className="stat-value">{kpis.newSignups7d}</strong>
            <span className="stat-sub">nos últimos 7 dias · {kpis.newSignups30d} em 30d</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="stat-label">Acessos e sessões</span>
            <strong className="stat-value">{kpis.activeSessionsCount}</strong>
            <span className="stat-sub">{kpis.recentLogins24h} usuários entraram nas últimas 24h</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon">
            <CalendarDays size={20} />
          </div>
          <div>
            <span className="stat-label">Cronogramas criados</span>
            <strong className="stat-value">{kpis.totalPlansCount}</strong>
            <span className="stat-sub">{kpis.onboardingCompletedCount} onboardings concluídos</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="stat-label">Atividades concluídas</span>
            <strong className="stat-value">
              {kpis.completedActivitiesCount} <span>de {kpis.totalActivitiesCount}</span>
            </strong>
            <span className="stat-sub">em todos os cronogramas</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon">
            <Clock size={20} />
          </div>
          <div>
            <span className="stat-label">Tempo estudado registrado</span>
            <strong className="stat-value">{formatMinutes(kpis.completedMinutesTotal)}</strong>
            <span className="stat-sub">somado no histórico de estudos</span>
          </div>
        </div>
      </div>

      <div className="adm-charts-grid">
        <section className="card dash-section" aria-labelledby="chart-growth-title">
          <div className="section-head">
            <div>
              <h3 id="chart-growth-title">Crescimento e logins (14 dias)</h3>
              <p className="section-sub">Cadastros diários vs. logins registrados</p>
            </div>
            <div className="adm-legend">
              <span>
                <i className="dot" style={{ background: 'var(--brand-600)' }} /> Cadastros
              </span>
              <span>
                <i className="dot" style={{ background: 'var(--area-natureza)' }} /> Logins
              </span>
            </div>
          </div>

          <div className="adm-chart" role="img" aria-label="Gráfico de cadastros e logins dos últimos 14 dias">
            {series.map((pt) => (
              <div key={pt.date} className="adm-chart-col" title={`${shortDayLabel(pt.date)}: ${pt.signups} cadastros, ${pt.logins} logins`}>
                <div className="adm-chart-bars">
                  <div className="adm-bar-track">
                    <div
                      className="adm-bar-fill"
                      style={{ height: `${pt.signups ? Math.max(10, (pt.signups / maxGrowth) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="adm-bar-track">
                    <div
                      className="adm-bar-fill is-secondary"
                      style={{ height: `${pt.logins ? Math.max(10, (pt.logins / maxGrowth) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <span className="adm-chart-label">{shortDayLabel(pt.date)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card dash-section" aria-labelledby="chart-study-title">
          <div className="section-head">
            <div>
              <h3 id="chart-study-title">Atividades concluídas (14 dias)</h3>
              <p className="section-sub">Volume diário registrado em study_logs</p>
            </div>
            <Activity size={18} className="profile-section-icon" aria-hidden="true" />
          </div>

          <div className="adm-chart" role="img" aria-label="Gráfico de atividades concluídas nos últimos 14 dias">
            {series.map((pt) => (
              <div
                key={pt.date}
                className="adm-chart-col"
                title={`${shortDayLabel(pt.date)}: ${pt.completedActivities} concluídas (${formatMinutes(pt.completedMinutes)})`}
              >
                <div className="adm-chart-bars single">
                  <div className="adm-bar-track">
                    <div
                      className="adm-bar-fill"
                      style={{ height: `${pt.completedActivities ? Math.max(10, (pt.completedActivities / maxStudy) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <span className="adm-chart-label">{shortDayLabel(pt.date)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card dash-section" aria-labelledby="feature-usage-title">
        <div className="section-head">
          <div>
            <h3 id="feature-usage-title">Utilização das funcionalidades</h3>
            <p className="section-sub">Adoção entre os usuários cadastrados</p>
          </div>
          {kpis.suspendedUsers > 0 && (
            <span className="tag">
              <ShieldAlert size={13} /> {kpis.suspendedUsers} suspensa(s)
            </span>
          )}
        </div>

        <div className="adm-usage-list">
          {featureUsage.map((item) => {
            const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
            return (
              <div key={item.label} className="adm-usage-row">
                <div className="adm-usage-top">
                  <strong>{item.label}</strong>
                  <span>
                    {item.count} de {item.total} ({pct}%)
                  </span>
                </div>
                <ProgressBar value={pct} label={`${item.label}: ${pct}%`} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
