import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SiteFeatures, SiteSettingsRow } from '../types/database';
import { readJSON, writeJSON } from './storage';
import { supabase } from './supabase';

export interface SiteSettings extends Omit<SiteSettingsRow, 'features'> {
  features: SiteFeatures;
}

export const DEFAULT_FEATURES: SiteFeatures = {
  schedule: true,
  dashboard: true,
  profile: true,
  study_history: true,
  exams_simulados: false,
  essay_redacao: false,
  question_bank: false,
  community: false,
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 'default',
  site_name: 'Studfy',
  logo_url: null,
  favicon_url: null,
  primary_color: '#6d3be0',
  accent_color: '#8257ef',
  institutional_tagline: 'Seu futuro, no seu ritmo.',
  hero_eyebrow: 'Preparação para o ENEM',
  hero_title: 'Seu futuro, no seu ritmo.',
  hero_subtitle:
    'O Studfy monta um cronograma semanal a partir da sua rotina, das suas dificuldades e do seu objetivo. Você abre, vê o que estudar hoje e segue em frente.',
  hero_cta_text: 'Criar minha conta',
  show_how_it_works: true,
  show_features: true,
  show_cta: true,
  announcement_enabled: false,
  announcement_text: '',
  maintenance_mode: false,
  maintenance_message: 'Estamos realizando melhorias rápidas na plataforma. Voltamos em instantes.',
  allow_public_signup: true,
  features: DEFAULT_FEATURES,
  updated_at: '',
  updated_by: null,
};

const CACHE_KEY = 'site_settings';

interface SiteConfigContextValue {
  settings: SiteSettings;
  loading: boolean;
  applyLocalSettings: (row: SiteSettingsRow) => void;
  refreshSiteConfig: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

function parseFeatures(raw: unknown): SiteFeatures {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_FEATURES;
  const obj = raw as Record<string, unknown>;
  return {
    schedule: typeof obj.schedule === 'boolean' ? obj.schedule : true,
    dashboard: typeof obj.dashboard === 'boolean' ? obj.dashboard : true,
    profile: typeof obj.profile === 'boolean' ? obj.profile : true,
    study_history: typeof obj.study_history === 'boolean' ? obj.study_history : true,
    exams_simulados: typeof obj.exams_simulados === 'boolean' ? obj.exams_simulados : false,
    essay_redacao: typeof obj.essay_redacao === 'boolean' ? obj.essay_redacao : false,
    question_bank: typeof obj.question_bank === 'boolean' ? obj.question_bank : false,
    community: typeof obj.community === 'boolean' ? obj.community : false,
  };
}

function normalizeSettings(row: Partial<SiteSettingsRow> | null | undefined): SiteSettings {
  if (!row) return DEFAULT_SITE_SETTINGS;
  return {
    ...DEFAULT_SITE_SETTINGS,
    ...row,
    features: parseFeatures(row.features),
  };
}

function mixHex(hexA: string, hexB: string, weightB: number): string {
  const clean = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = clean(hexA);
  const [r2, g2, b2] = clean(hexB);
  const w = Math.max(0, Math.min(1, weightB));
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(r1 * (1 - w) + r2 * w)}${toHex(g1 * (1 - w) + g2 * w)}${toHex(b1 * (1 - w) + b2 * w)}`;
}

function applyThemeAndMeta(s: SiteSettings): void {
  const root = document.documentElement;
  const isDefaultColors =
    s.primary_color.toLowerCase() === DEFAULT_SITE_SETTINGS.primary_color &&
    s.accent_color.toLowerCase() === DEFAULT_SITE_SETTINGS.accent_color;

  if (isDefaultColors) {
    for (const step of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
      root.style.removeProperty(`--brand-${step}`);
    }
  } else if (/^#[0-9a-fA-F]{6}$/.test(s.primary_color) && /^#[0-9a-fA-F]{6}$/.test(s.accent_color)) {
    root.style.setProperty('--brand-50', mixHex(s.accent_color, '#ffffff', 0.92));
    root.style.setProperty('--brand-100', mixHex(s.accent_color, '#ffffff', 0.84));
    root.style.setProperty('--brand-200', mixHex(s.accent_color, '#ffffff', 0.68));
    root.style.setProperty('--brand-300', mixHex(s.accent_color, '#ffffff', 0.45));
    root.style.setProperty('--brand-400', mixHex(s.accent_color, '#ffffff', 0.22));
    root.style.setProperty('--brand-500', s.accent_color);
    root.style.setProperty('--brand-600', s.primary_color);
    root.style.setProperty('--brand-700', mixHex(s.primary_color, '#000000', 0.16));
    root.style.setProperty('--brand-800', mixHex(s.primary_color, '#000000', 0.32));
    root.style.setProperty('--brand-900', mixHex(s.primary_color, '#000000', 0.54));
  }

  document.title = `${s.site_name} — ${s.institutional_tagline}`;

  const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (iconLink) {
    iconLink.href = s.favicon_url || '/studfy-logo.png';
  }
}

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const cached = readJSON<Partial<SiteSettingsRow> | null>(CACHE_KEY, null);
    return normalizeSettings(cached);
  });
  const [loading, setLoading] = useState(true);

  const applyLocalSettings = useCallback((row: SiteSettingsRow) => {
    const next = normalizeSettings(row);
    setSettings(next);
    writeJSON(CACHE_KEY, row);
    applyThemeAndMeta(next);
  }, []);

  const refreshSiteConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && data) {
        applyLocalSettings(data);
      }
    } finally {
      setLoading(false);
    }
  }, [applyLocalSettings]);

  useEffect(() => {
    applyThemeAndMeta(settings);
    void refreshSiteConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ settings, loading, applyLocalSettings, refreshSiteConfig }),
    [settings, loading, applyLocalSettings, refreshSiteConfig],
  );

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig(): SiteConfigContextValue {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig deve ser usado dentro de SiteConfigProvider');
  return ctx;
}
