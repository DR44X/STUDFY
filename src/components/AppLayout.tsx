import { NavLink, Outlet, Link } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, LogOut, SlidersHorizontal } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../lib/auth';
import { firstName } from '../lib/progress';
import '../styles/app.css';

const LINKS = [
  { to: '/painel', label: 'Painel', icon: LayoutDashboard },
  { to: '/cronograma', label: 'Cronograma', icon: CalendarDays },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const initial = (user?.name?.trim()[0] ?? 'E').toUpperCase();

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
          <Link to="/onboarding" className="app-nav-link app-nav-muted">
            <SlidersHorizontal size={18} />
            <span>Ajustar plano</span>
          </Link>

          <div className="app-user">
            <span className="app-avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="app-user-info">
              <strong>{firstName(user?.name ?? '')}</strong>
              <span>{user?.email}</span>
            </div>
            <button type="button" className="icon-btn" onClick={logout} aria-label="Sair da conta" title="Sair">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <header className="app-mobile-header">
        <Logo to="/painel" size="sm" />
        <div className="app-mobile-header-actions">
          <Link to="/onboarding" className="icon-btn" aria-label="Ajustar plano" title="Ajustar plano">
            <SlidersHorizontal size={19} />
          </Link>
          <button type="button" className="icon-btn" onClick={logout} aria-label="Sair da conta" title="Sair">
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
