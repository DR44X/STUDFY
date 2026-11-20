import type { ReactNode } from 'react';
import { CalendarCheck2, Flame, TrendingUp } from 'lucide-react';
import { Logo } from './Logo';
import '../styles/auth.css';

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth">
      <div className="auth-main">
        <header className="auth-top">
          <Logo />
        </header>
        <div className="auth-content">
          <div className="auth-heading">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </div>
      <aside className="auth-aside" aria-hidden="true">
        <div className="auth-aside-inner">
          <p className="auth-aside-slogan">Seu futuro, no seu ritmo.</p>
          <ul>
            <li>
              <CalendarCheck2 size={18} /> Cronograma semanal feito para a sua rotina
            </li>
            <li>
              <TrendingUp size={18} /> Progresso claro, dia após dia
            </li>
            <li>
              <Flame size={18} /> Constância que vira resultado
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
