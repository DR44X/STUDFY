import { Link } from 'react-router-dom';
import studfyLogo from '../assets/studfy-logo.png';

interface LogoProps {
  to?: string;
  size?: 'sm' | 'md';
  inverted?: boolean;
}

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <img
      src={studfyLogo}
      alt=""
      width={size}
      height={size}
      className="logo-img"
      decoding="async"
      aria-hidden="true"
    />
  );
}

export function Logo({ to = '/', size = 'md', inverted = false }: LogoProps) {
  return (
    <Link to={to} className={`logo logo-${size}${inverted ? ' logo-inverted' : ''}`} aria-label="Studfy — página inicial">
      <LogoMark size={size === 'sm' ? 30 : 36} />
      <span>Studfy</span>
    </Link>
  );
}
