import { NavLink, Outlet, Link } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, LogOut, Megaphone, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react';
import { Logo } from './Logo';
import { getDisplayName, useAuth } from '../lib/auth';
import { firstName } from '../lib/progress';
import { useSiteConfig } from '../lib/siteConfig';
import type { SiteFeatures } from '../types/database';
import '../styles/app.css';

const LINKS: { to: string; label: string; icon: typeof LayoutDashboard; feature: keyof SiteFeatures }[] = [
  { to: '/painel', label: 'Painel', icon: LayoutDashboard, feature: 'dashboard' },
  { to: '/cronograma', label: 'Cronograma', icon: CalendarDays, feature: 'schedule' },
  { to: '/perfil', label: 'Perfil', icon: UserRound, feature: 'profile' },
];

export function AppLayout() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { settings } = useSiteConfig();
  const displayName = getDisplayName(profile, user);
  const initial = (displayName.trim()[0] ?? 'E').toUpperCase();

  const visibleLinks = LINKS.filter((l) => isAdmin || settings.features[l.feature]);
  const navLinks = isAdmin
    ? [...visibleLinks, { to: '/admin', label: 'Admin', icon: ShieldCheck }]
    : visibleLinks;

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Navegação principal">
        <div className="app-sidebar-top">
          <Logo to="/painel" size="sm" />
        </div>

        <nav className="app-nav">
          {navLinks.map(({ to, label, icon: Icon }) => (
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
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initial}
              </span>
              <div className="app-user-info">
                <strong>
                  {firstName(displayName)}
                  {isAdmin && <span className="tag tag-brand app-role-tag">Admin</span>}
                </strong>
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
          {settings.announcement_enabled && settings.announcement_text && (
            <div className="alert alert-info app-announcement" role="status">
              <Megaphone size={17} />
              <span>{settings.announcement_text}</span>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      <nav className="app-bottom-nav" aria-label="Navegação inferior">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `app-bottom-link${isActive ? ' is-active' : ''}`}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
