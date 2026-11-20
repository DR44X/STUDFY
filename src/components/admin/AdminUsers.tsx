import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
} from 'lucide-react';
import {
  callAdminApi,
  type AdminUserDetailResponse,
  type AdminUserItem,
} from '../../lib/adminApi';
import { useAuth } from '../../lib/auth';
import { formatMinutes } from '../../lib/dates';
import { Button } from '../Button';
import { ConfirmModal } from './ConfirmModal';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Nunca';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function AdminUsers() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [modalAction, setModalAction] = useState<
    | { type: 'suspend'; userId: string; label: string }
    | { type: 'reactivate'; userId: string; label: string }
    | { type: 'revoke_all'; userId: string; label: string }
    | null
  >(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await callAdminApi<{ users: AdminUserItem[] }>('list_users', {
        search,
        dateFrom,
        dateTo,
        status: statusFilter,
        role: roleFilter,
      });
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, roleFilter, search, statusFilter]);

  const loadDetail = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    setFeedback(null);
    try {
      const res = await callAdminApi<AdminUserDetailResponse>('get_user_detail', { userId });
      setDetail(res);
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao carregar detalhes.' });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const executeConfirmedAction = async () => {
    if (!modalAction || actionBusy) return;
    setActionBusy(true);
    setFeedback(null);
    try {
      if (modalAction.type === 'suspend') {
        await callAdminApi('suspend_user', { userId: modalAction.userId, reason: suspendReason });
        setFeedback({ type: 'success', text: `Conta ${modalAction.label} suspensa e sessões encerradas.` });
      } else if (modalAction.type === 'reactivate') {
        await callAdminApi('reactivate_user', { userId: modalAction.userId });
        setFeedback({ type: 'success', text: `Conta ${modalAction.label} reativada com sucesso.` });
      } else if (modalAction.type === 'revoke_all') {
        const res = await callAdminApi<{ count: number }>('revoke_user_sessions', { userId: modalAction.userId });
        setFeedback({
          type: 'success',
          text: `${res.count} sessão(ões) ativa(s) encerrada(s) para ${modalAction.label}.`,
        });
      }

      setModalAction(null);
      setSuspendReason('');
      await loadUsers();
      if (selectedUserId) {
        await loadDetail(selectedUserId);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Falha na operação.' });
      setModalAction(null);
    } finally {
      setActionBusy(false);
    }
  };

  if (selectedUserId) {
    const u = detail?.user;
    const isSelf = u?.id === currentAdmin?.id;

    return (
      <div className="adm-section">
        <div className="adm-section-bar">
          <button
            type="button"
            className="auth-back"
            onClick={() => {
              setSelectedUserId(null);
              setDetail(null);
              setFeedback(null);
            }}
          >
            <ArrowLeft size={16} /> Voltar para lista de usuários
          </button>
          {u && (
            <Button type="button" variant="secondary" size="sm" loading={detailLoading} onClick={() => void loadDetail(u.id)}>
              <RefreshCw size={15} /> Atualizar
            </Button>
          )}
        </div>

        {feedback && (
          <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} role="status">
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {detailLoading && !detail ? (
          <div className="page-loading page-loading-inline" role="status" aria-label="Carregando detalhes do usuário">
            <span className="spinner spinner-brand" aria-hidden="true" />
          </div>
        ) : u && detail ? (
          <>
            <section className="card dash-section">
              <div className="adm-user-hero">
                <div className="adm-user-ident">
                  <div className="profile-avatar-lg" aria-hidden="true">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" />
                    ) : (
                      <span>{((u.full_name ?? u.email)[0] ?? 'E').toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="adm-user-badges">
                      <h2>{u.full_name || 'Sem nome cadastrado'}</h2>
                      <span className={`tag ${u.role === 'admin' ? 'tag-brand' : ''}`}>
                        {u.role === 'admin' ? 'Administrador' : 'Estudante'}
                      </span>
                      <span className={`tag ${u.status === 'suspended' ? 'adm-tag-danger' : 'tag-success'}`}>
                        {u.status === 'suspended' ? 'Suspensa' : 'Ativa'}
                      </span>
                    </div>
                    <p className="section-sub">
                      {u.email} {u.username ? `· @${u.username}` : ''}
                    </p>
                    <p className="adm-meta-line">
                      Cadastro: {formatDateTime(u.created_at)} · Último login: {formatDateTime(u.last_sign_in_at)} · E-mail:{' '}
                      {u.email_confirmed_at ? 'Confirmado' : 'Pendente'}
                    </p>
                    {u.status === 'suspended' && u.suspended_reason && (
                      <p className="adm-meta-line adm-text-danger">Motivo da suspensão: {u.suspended_reason}</p>
                    )}
                  </div>
                </div>

                <div className="adm-user-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setModalAction({ type: 'revoke_all', userId: u.id, label: u.email })}
                  >
                    <LogOut size={15} /> Encerrar sessões
                  </Button>
                  {u.status === 'active' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isSelf}
                      title={isSelf ? 'Você não pode suspender a própria conta' : undefined}
                      onClick={() => setModalAction({ type: 'suspend', userId: u.id, label: u.email })}
                    >
                      <Ban size={15} /> Suspender conta
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setModalAction({ type: 'reactivate', userId: u.id, label: u.email })}
                    >
                      <UserCheck size={15} /> Reativar conta
                    </Button>
                  )}
                </div>
              </div>
            </section>

            <div className="adm-detail-grid">
              <section className="card dash-section">
                <div className="section-head">
                  <div>
                    <h3>Progresso e preferências</h3>
                    <p className="section-sub">Onboarding e rotina de estudo</p>
                  </div>
                  <CalendarDays size={18} className="profile-section-icon" aria-hidden="true" />
                </div>

                {detail.preferences ? (
                  <dl className="adm-dl">
                    <div>
                      <dt>Objetivo</dt>
                      <dd>{detail.preferences.goal}</dd>
                    </div>
                    <div>
                      <dt>Nível</dt>
                      <dd>{detail.preferences.level}</dd>
                    </div>
                    <div>
                      <dt>Tempo diário</dt>
                      <dd>{formatMinutes(detail.preferences.daily_minutes)}</dd>
                    </div>
                    <div>
                      <dt>Dias por semana</dt>
                      <dd>{detail.preferences.days_per_week} dias</dd>
                    </div>
                    <div>
                      <dt>Dificuldades</dt>
                      <dd>{detail.preferences.difficulties.join(', ') || 'Equilibrada'}</dd>
                    </div>
                    <div>
                      <dt>Cronogramas salvos</dt>
                      <dd>{detail.plans.length}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="empty-inline">Estudante ainda não preencheu o onboarding.</p>
                )}
              </section>

              <section className="card dash-section">
                <div className="section-head">
                  <div>
                    <h3>Histórico recente de estudos</h3>
                    <p className="section-sub">Últimos registros em study_logs</p>
                  </div>
                  <Clock size={18} className="profile-section-icon" aria-hidden="true" />
                </div>

                {detail.studyLogs.length === 0 ? (
                  <p className="empty-inline">Nenhuma atividade concluída registrada ainda.</p>
                ) : (
                  <div className="adm-mini-list">
                    {detail.studyLogs.slice(0, 8).map((log) => (
                      <div key={log.study_date} className="adm-mini-row">
                        <strong>{log.study_date}</strong>
                        <span>
                          {log.completed_count} atividade(s) · {formatMinutes(log.completed_minutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="adm-detail-grid">
              <section className="card dash-section">
                <div className="section-head">
                  <div>
                    <h3>Atividades do cronograma ({detail.activities.length})</h3>
                    <p className="section-sub">Atividades persistidas no banco</p>
                  </div>
                </div>
                {detail.activities.length === 0 ? (
                  <p className="empty-inline">Sem atividades registradas.</p>
                ) : (
                  <div className="adm-mini-list">
                    {detail.activities.slice(0, 12).map((act) => (
                      <div key={act.id} className="adm-mini-row">
                        <div>
                          <strong>{act.subject_id}</strong> — {act.topic}
                        </div>
                        <span className={`tag ${act.done ? 'tag-success' : ''}`}>
                          {act.done ? 'Concluída' : 'Pendente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="card dash-section">
                <div className="section-head">
                  <div>
                    <h3>Sessões ativas ({detail.activeSessions.length}) e acessos</h3>
                    <p className="section-sub">Últimos eventos de autenticação</p>
                  </div>
                  <ShieldCheck size={18} className="profile-section-icon" aria-hidden="true" />
                </div>
                {detail.authEvents.length === 0 && detail.activeSessions.length === 0 ? (
                  <p className="empty-inline">Sem eventos registrados para esta conta.</p>
                ) : (
                  <div className="adm-mini-list">
                    {detail.authEvents.slice(0, 8).map((ev) => (
                      <div key={ev.id} className="adm-mini-row">
                        <strong>{ev.event_type}</strong>
                        <span>{formatDateTime(ev.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : null}

        <ConfirmModal
          open={Boolean(modalAction)}
          title={
            modalAction?.type === 'suspend'
              ? 'Suspender conta'
              : modalAction?.type === 'reactivate'
                ? 'Reativar conta'
                : 'Encerrar sessões remotamente'
          }
          description={
            modalAction?.type === 'suspend'
              ? `A conta ${modalAction.label} será bloqueada imediatamente e todas as sessões ativas serão encerradas.`
              : modalAction?.type === 'reactivate'
                ? `A conta ${modalAction?.label} voltará a ter acesso normal ao Studfy.`
                : `Todas as sessões ativas da conta ${modalAction?.label} serão encerradas.`
          }
          confirmLabel={
            modalAction?.type === 'suspend'
              ? 'Confirmar suspensão'
              : modalAction?.type === 'reactivate'
                ? 'Reativar conta'
                : 'Encerrar sessões'
          }
          danger={modalAction?.type !== 'reactivate'}
          loading={actionBusy}
          onCancel={() => {
            setModalAction(null);
            setSuspendReason('');
          }}
          onConfirm={() => void executeConfirmedAction()}
        >
          {modalAction?.type === 'suspend' && (
            <div className="field">
              <label className="field-label" htmlFor="suspend-reason">
                Motivo da suspensão (opcional)
              </label>
              <input
                id="suspend-reason"
                className="input"
                placeholder="Ex.: Uso indevido ou solicitação do usuário"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          )}
        </ConfirmModal>
      </div>
    );
  }

  return (
    <div className="adm-section">
      <div className="adm-section-bar">
        <div>
          <h2>Usuários</h2>
          <p className="section-sub">Pesquise estudantes e administradores, consulte progresso e gerencie contas.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" loading={loading} onClick={() => void loadUsers()}>
          <RefreshCw size={15} /> Atualizar
        </Button>
      </div>

      <section className="card dash-section">
        <div className="adm-filters">
          <div className="adm-search-wrap">
            <Search size={16} className="adm-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="input adm-search-input"
              placeholder="Buscar por nome, e-mail ou username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input adm-select" aria-label="Filtrar por papel" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}>
            <option value="all">Todos os papéis</option>
            <option value="student">Estudantes</option>
            <option value="admin">Administradores</option>
          </select>
          <select className="input adm-select" aria-label="Filtrar por status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="suspended">Suspensos</option>
          </select>
          <input type="date" className="input adm-date" aria-label="Cadastro a partir de" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="input adm-date" aria-label="Cadastro até" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginTop: 14 }}>
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}

        {loading && users.length === 0 ? (
          <div className="page-loading page-loading-inline" role="status" aria-label="Carregando usuários">
            <span className="spinner spinner-brand" aria-hidden="true" />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-box" style={{ marginTop: 16 }}>
            <UserRound size={22} />
            <h3>Nenhum usuário encontrado</h3>
            <p>Ajuste os filtros de pesquisa para visualizar outras contas.</p>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Papel</th>
                  <th>Situação</th>
                  <th>Progresso</th>
                  <th>Cadastro</th>
                  <th>Último acesso</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="adm-table-user">
                        <strong>{u.full_name || 'Sem nome'}</strong>
                        <span>
                          {u.email}
                          {u.username ? ` · @${u.username}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`tag ${u.role === 'admin' ? 'tag-brand' : ''}`}>
                        {u.role === 'admin' ? 'Admin' : 'Estudante'}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${u.status === 'suspended' ? 'adm-tag-danger' : 'tag-success'}`}>
                        {u.status === 'suspended' ? 'Suspensa' : 'Ativa'}
                      </span>
                    </td>
                    <td>
                      <div className="adm-table-user">
                        <strong>
                          {u.activities_done}/{u.activities_total} ativ.
                        </strong>
                        <span>
                          {u.plans_count} plano(s) · {formatMinutes(u.study_minutes_total)}
                        </span>
                      </div>
                    </td>
                    <td>{formatDateTime(u.created_at)}</td>
                    <td>{formatDateTime(u.last_sign_in_at)}</td>
                    <td className="adm-table-actions">
                      <Button type="button" variant="secondary" size="sm" onClick={() => void loadDetail(u.id)}>
                        Detalhes
                      </Button>
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
