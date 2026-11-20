import { NavLink, Outlet, Link } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, LogOut, SlidersHorizontal, UserRound } from 'lucide-react';
import { Logo } from './Logo';
import { getDisplayName, useAuth } from '../lib/auth';
import { firstName } from '../lib/progress';
import '../styles/app.css';

const LINKS = [
  { to: '/painel', label: 'Painel', icon: LayoutDashboard },
  { to: '/cronograma', label: 'Cronograma', icon: CalendarDays },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
];

export function AppLayout() {
  const { user, profile, signOut } = useAuth();
  const displayName = getDisplayName(profile, user);
  const initial = (displayName.trim()[0] ?? 'E').toUpperCase();

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Navegação principal">
        <div className="app-sidebar-top">
          <Logo to="/painel" size="sm" />
        </div>

        <nav className="app-nav">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <Link to="/onboarding?editar=1" className="app-nav-link app-nav-muted">
            <SlidersHorizontal size={18} />
            <span>Ajustar plano</span>
          </Link>

          <div className="app-user">
            <Link to="/perfil" className="app-user-link" title="Abrir perfil">
              <span className="app-avatar" aria-hidden="true">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" />
                ) : (
                  initial
                )}
              </span>
              <div className="app-user-info">
                <strong>{firstName(displayName)}</strong>
                <span>{profile?.username ? `@${profile.username}` : user?.email}</span>
              </div>
            </Link>
            <button type="button" className="icon-btn" onClick={() => void signOut()} aria-label="Sair da conta" title="Sair">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <header className="app-mobile-header">
        <Logo to="/painel" size="sm" />
        <div className="app-mobile-header-actions">
          <Link to="/onboarding?editar=1" className="icon-btn" aria-label="Ajustar plano" title="Ajustar plano">
            <SlidersHorizontal size={19} />
          </Link>
          <button type="button" className="icon-btn" onClick={() => void signOut()} aria-label="Sair da conta" title="Sair">
            <LogOut size={19} />
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="app-container">
          <Outlet />
        </div>
      </main>

      <nav className="app-bottom-nav" aria-label="Navegação inferior">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `app-bottom-link${isActive ? ' is-active' : ''}`}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
