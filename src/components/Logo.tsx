import { Link } from 'react-router-dom';

interface LogoProps {
  to?: string;
  size?: 'sm' | 'md';
  inverted?: boolean;
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="studfy-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8257ef" />
          <stop offset="1" stopColor="#5b2cc4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#studfy-g)" />
      <path
        d="M10.5 20.2c1.3 1.7 3.2 2.6 5.6 2.6 3.4 0 5.6-1.6 5.6-4.1 0-2.3-1.7-3.3-5-4l-1.3-.3c-1.8-.4-2.5-.9-2.5-1.8 0-1 1-1.7 2.7-1.7 1.5 0 2.7.6 3.5 1.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ to = '/', size = 'md', inverted = false }: LogoProps) {
  return (
    <Link to={to} className={`logo logo-${size}${inverted ? ' logo-inverted' : ''}`} aria-label="Studfy — página inicial">
      <LogoMark size={size === 'sm' ? 28 : 32} />
      <span>Studfy</span>
    </Link>
  );
}
