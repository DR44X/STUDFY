import { ShieldCheck, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDisplayName, useAuth } from '../lib/auth';

export default function Admin() {
  const { user, profile, isAdmin } = useAuth();
  const displayName = getDisplayName(profile, user);

  if (!user || !isAdmin) return null;

  return (
    <div className="dash">
      <header className="page-head">
        <div>
          <p className="page-date">Acesso restrito</p>
          <h1>Administração</h1>
        </div>
        <Link to="/perfil" className="btn btn-secondary btn-sm">
          <UserCheck size={16} /> Ver meu perfil
        </Link>
      </header>

      <section className="dash-stats" aria-label="Status administrativo">
        <div className="card stat-card">
          <div className="stat-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="stat-label">Papel da conta</span>
            <strong className="stat-value">Administrador</strong>
            <span className="stat-sub">{user.email}</span>
          </div>
        </div>
      </section>

      <section className="card dash-section" aria-labelledby="admin-overview-heading">
        <div className="section-head">
          <div>
            <h2 id="admin-overview-heading">Permissões ativas</h2>
            <p className="section-sub">
              Conta autenticada como administradora na plataforma ({displayName}).
            </p>
          </div>
          <span className="tag tag-brand">Admin</span>
        </div>
        <p className="empty-inline">
          Seu usuário possui papel <code>admin</code> validado no banco de dados e nos metadados de segurança da conta.
        </p>
      </section>
    </div>
  );
}
