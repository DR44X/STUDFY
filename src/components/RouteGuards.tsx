import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

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
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/entrar" replace state={{ from }} />;
  }
  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

/** Controla o acesso ao onboarding: obrigatório para novos usuários, opcional apenas via ?editar=1. */
export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/entrar" replace state={{ from }} />;
  }

  const isEditing = new URLSearchParams(location.search).get('editar') === '1';
  if (profile?.onboarding_completed && !isEditing) {
    return <Navigate to="/painel" replace />;
  }

  return <>{children}</>;
}
