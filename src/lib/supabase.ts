import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

function validateSupabaseConfig(url: string | undefined, key: string | undefined): { url: string; key: string } {
  if (!url || !key) {
    throw new Error(
      'Variáveis de ambiente do Supabase ausentes. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('VITE_SUPABASE_URL inválida. Informe uma URL completa, como https://seu-projeto.supabase.co.');
  }

  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(isLocal && parsed.protocol === 'http:')) {
    throw new Error('VITE_SUPABASE_URL deve usar protocolo HTTPS.');
  }

  if (/^https?:\/\//i.test(key)) {
    throw new Error(
      'VITE_SUPABASE_PUBLISHABLE_KEY recebeu uma URL em vez da chave pública do Supabase (sb_publishable_...).',
    );
  }

  if (key.startsWith('sb_secret_') || key.toLowerCase().includes('service_role')) {
    throw new Error('Nunca utilize chaves privadas ou service_role no frontend.');
  }

  const isPublishable = key.startsWith('sb_publishable_');
  const isLegacyJwt = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key);
  if (!isPublishable && !isLegacyJwt) {
    throw new Error('Formato inválido para VITE_SUPABASE_PUBLISHABLE_KEY.');
  }

  return { url: parsed.origin, key };
}

const config = validateSupabaseConfig(supabaseUrl, supabasePublishableKey);

export const supabase = createClient<Database>(config.url, config.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

/** Monta uma URL de redirecionamento segura dentro da própria origem da aplicação. */
export function getAuthRedirectUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}
