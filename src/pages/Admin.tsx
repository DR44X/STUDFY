import { useState } from 'react';
import {
  Database,
  FileClock,
  KeyRound,
  LayoutGrid,
  Palette,
  Settings,
  Sliders,
  Users,
} from 'lucide-react';
import { AdminAudit } from '../components/admin/AdminAudit';
import { AdminBranding } from '../components/admin/AdminBranding';
import { AdminDatabase } from '../components/admin/AdminDatabase';
import { AdminFeatures } from '../components/admin/AdminFeatures';
import { AdminOverview } from '../components/admin/AdminOverview';
import { AdminSessions } from '../components/admin/AdminSessions';
import { AdminSettings } from '../components/admin/AdminSettings';
import { AdminUsers } from '../components/admin/AdminUsers';
import { getDisplayName, useAuth } from '../lib/auth';
import '../styles/admin.css';

type SectionId = 'overview' | 'users' | 'sessions' | 'database' | 'branding' | 'features' | 'audit' | 'settings';

const SECTIONS: { id: SectionId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Visão geral', icon: LayoutGrid },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'sessions', label: 'Acessos e sessões', icon: KeyRound },
  { id: 'database', label: 'Banco de dados', icon: Database },
  { id: 'branding', label: 'Personalização', icon: Palette },
  { id: 'features', label: 'Funcionalidades', icon: Sliders },
  { id: 'audit', label: 'Logs e auditoria', icon: FileClock },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export default function Admin() {
  const { user, profile, isAdmin } = useAuth();
  const [active, setActive] = useState<SectionId>('overview');
  const displayName = getDisplayName(profile, user);

  if (!user || !isAdmin) return null;

  return (
    <div className="adm-page">
      <header className="page-head">
        <div>
          <p className="page-date">Centro de controle administrativo · {displayName}</p>
          <h1>Administração</h1>
        </div>
        <span className="tag tag-brand">Administrador verificado</span>
      </header>

      <div className="adm-shell">
        <nav className="card adm-nav" aria-label="Seções administrativas">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                type="button"
                className={`adm-nav-item${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActive(id)}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="adm-content">
          {active === 'overview' && <AdminOverview />}
          {active === 'users' && <AdminUsers />}
          {active === 'sessions' && <AdminSessions />}
          {active === 'database' && <AdminDatabase />}
          {active === 'branding' && <AdminBranding />}
          {active === 'features' && <AdminFeatures />}
          {active === 'audit' && <AdminAudit />}
          {active === 'settings' && <AdminSettings />}
        </div>
      </div>
    </div>
  );
}
