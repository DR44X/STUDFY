import { Link } from 'react-router-dom';
import studfyLogo from '../assets/studfy-logo.png';
import { useSiteConfig } from '../lib/siteConfig';

interface LogoProps {
  to?: string;
  size?: 'sm' | 'md';
  inverted?: boolean;
}

export function LogoMark({ size = 34 }: { size?: number }) {
  const { settings } = useSiteConfig();
  return (
    <img
      src={settings.logo_url || studfyLogo}
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
  const { settings } = useSiteConfig();
  const brandName = settings.site_name || 'Studfy';
  return (
    <Link to={to} className={`logo logo-${size}${inverted ? ' logo-inverted' : ''}`} aria-label={`${brandName} — página inicial`}>
      <LogoMark size={size === 'sm' ? 30 : 36} />
      <span>{brandName}</span>
    </Link>
  );
}
