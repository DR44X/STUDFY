import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, Wrench } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useSiteConfig } from '../lib/siteConfig';
import type { SiteFeatures } from '../types/database';

export function PageLoader({ label = 'Verificando sua sessão...' }: { label?: string }) {
  return (
    <div className="page-loading" role="status" aria-live="polite" aria-label={label}>
      <span className="spinner spinner-brand" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Impede que usuários autenticados acessem páginas exclusivas de visitantes. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading, isRecovery } = useAuth();

  if (loading) return <PageLoader />;
  if (user && !isRecovery) {
    return <Navigate to={profile?.onboarding_completed ? '/painel' : '/onboarding'} replace />;
  }

  return <>{children}</>;
}

/** Protege rotas privadas e exige onboarding concluído. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const { settings } = useSiteConfig();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/entrar" replace state={{ from }} />;
  }
  if (profile && !profile.onboarding_completed && !isAdmin) {
    return <Navigate to="/onboarding" replace />;
  }

  if (settings.maintenance_mode && !isAdmin) {
    return (
      <div className="page-loading">
        <div className="card dash-section" style={{ maxWidth: 460, margin: '24px', textAlign: 'center' }}>
          <div className="empty-box">
            <Wrench size={24} />
            <h3>Plataforma em manutenção</h3>
            <p>{settings.maintenance_message}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void signOut()}>
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Controla disponibilidade de módulos individuais conforme configuração administrativa. */
export function FeatureRoute({ feature, title, children }: { feature: keyof SiteFeatures; title: string; children: ReactNode }) {
  const { isAdmin } = useAuth();
  const { settings } = useSiteConfig();

  if (!isAdmin && !settings.features[feature]) {
    return (
      <div className="card dash-section">
        <div className="empty-box">
          <ShieldAlert size={22} />
          <h3>{title} temporariamente desativado</h3>
          <p>Este módulo está desabilitado pela administração no momento.</p>
          <Link to="/painel" className="btn btn-secondary btn-sm">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Controla o acesso ao onboarding: obrigatório para novos usuários, opcional apenas via ?editar=1. */
export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/entrar" replace state={{ from }} />;
  }

  const isEditing = new URLSearchParams(location.search).get('editar') === '1';
  if (profile?.onboarding_completed && !isEditing && !isAdmin) {
    return <Navigate to="/painel" replace />;
  }

  return <>{children}</>;
}

/** Restringe rotas administrativas apenas a usuários com papel de administrador ativo. */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/entrar" replace state={{ from }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/painel" replace />;
  }

  return <>{children}</>;
}
