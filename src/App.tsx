import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { useStudy } from './lib/study';
import { Landing } from './pages/Landing';
import { AppLayout } from './components/AppLayout';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Schedule = lazy(() => import('./pages/Schedule'));

/** Páginas públicas de conta: quem já está logado segue para o fluxo do app. */
function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data } = useStudy();
  if (user) return <Navigate to={data.onboarding ? '/painel' : '/onboarding'} replace />;
  return <>{children}</>;
}

/** Exige login e, opcionalmente, onboarding concluído. */
function RequireAuth({ children, onboarded = true }: { children: ReactNode; onboarded?: boolean }) {
  const { user } = useAuth();
  const { data } = useStudy();
  const location = useLocation();
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  if (onboarded && !data.onboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="page-loading" aria-label="Carregando" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/entrar" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/cadastro" element={<GuestOnly><Register /></GuestOnly>} />
          <Route path="/recuperar-senha" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
          <Route path="/onboarding" element={<RequireAuth onboarded={false}><Onboarding /></RequireAuth>} />
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/painel" element={<Dashboard />} />
            <Route path="/cronograma" element={<Schedule />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
