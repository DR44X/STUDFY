import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, Palette, RotateCcw } from 'lucide-react';
import studfyLogo from '../../assets/studfy-logo.png';
import { callAdminApi, uploadBrandingAsset, type SiteSettingsRow } from '../../lib/adminApi';
import { DEFAULT_SITE_SETTINGS, useSiteConfig } from '../../lib/siteConfig';
import { Button } from '../Button';
import { Field } from '../Field';

export function AdminBranding() {
  const { settings, applyLocalSettings } = useSiteConfig();
  const [draft, setDraft] = useState({
    site_name: settings.site_name,
    institutional_tagline: settings.institutional_tagline,
    primary_color: settings.primary_color,
    accent_color: settings.accent_color,
    logo_url: settings.logo_url ?? '',
    favicon_url: settings.favicon_url ?? '',
    hero_eyebrow: settings.hero_eyebrow,
    hero_title: settings.hero_title,
    hero_subtitle: settings.hero_subtitle,
    hero_cta_text: settings.hero_cta_text,
    show_how_it_works: settings.show_how_it_works,
    show_features: settings.show_features,
    show_cta: settings.show_cta,
    announcement_enabled: settings.announcement_enabled,
    announcement_text: settings.announcement_text,
    maintenance_mode: settings.maintenance_mode,
    maintenance_message: settings.maintenance_message,
  });

  const [saving, setSaving] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<'logo' | 'favicon' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft({
      site_name: settings.site_name,
      institutional_tagline: settings.institutional_tagline,
      primary_color: settings.primary_color,
      accent_color: settings.accent_color,
      logo_url: settings.logo_url ?? '',
      favicon_url: settings.favicon_url ?? '',
      hero_eyebrow: settings.hero_eyebrow,
      hero_title: settings.hero_title,
      hero_subtitle: settings.hero_subtitle,
      hero_cta_text: settings.hero_cta_text,
      show_how_it_works: settings.show_how_it_works,
      show_features: settings.show_features,
      show_cta: settings.show_cta,
      announcement_enabled: settings.announcement_enabled,
      announcement_text: settings.announcement_text,
      maintenance_mode: settings.maintenance_mode,
      maintenance_message: settings.maintenance_message,
    });
  }, [settings]);

  const handleUpload = (kind: 'logo' | 'favicon') => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploadingKind) return;

    setUploadingKind(kind);
    setFeedback(null);
    try {
      const publicUrl = await uploadBrandingAsset(kind, file);
      setDraft((d) => ({ ...d, [kind === 'logo' ? 'logo_url' : 'favicon_url']: publicUrl }));
      setFeedback({ type: 'success', text: `${kind === 'logo' ? 'Logo' : 'Favicon'} enviada. Clique em "Salvar personalização" para aplicar.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao enviar arquivo.' });
    } finally {
      setUploadingKind(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await callAdminApi<{ settings: SiteSettingsRow }>('update_site_settings', {
        settings: {
          ...draft,
          logo_url: draft.logo_url.trim() || null,
          favicon_url: draft.favicon_url.trim() || null,
        },
      });
      applyLocalSettings(res.settings);
      setFeedback({ type: 'success', text: 'Personalização salva e aplicada globalmente no site.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Não foi possível salvar a personalização.' });
    } finally {
      setSaving(false);
    }
  };

  const resetColors = () => {
    setDraft((d) => ({
      ...d,
      primary_color: DEFAULT_SITE_SETTINGS.primary_color,
      accent_color: DEFAULT_SITE_SETTINGS.accent_color,
    }));
  };

  return (
    <div className="adm-section">
      <div className="adm-section-bar">
        <div>
          <h2>Personalização</h2>
          <p className="section-sub">Gerencie identidade visual, página inicial, comunicados e manutenção.</p>
        </div>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} role="status">
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      <form className="adm-form-stack" onSubmit={handleSubmit}>
        <section className="card dash-section">
          <div className="section-head">
            <div>
              <h3>Identidade visual</h3>
              <p className="section-sub">Nome da marca, logo, favicon e paleta roxa principal.</p>
            </div>
            <Palette size={18} className="profile-section-icon" aria-hidden="true" />
          </div>

          <div className="adm-form-grid">
            <Field
              label="Nome exibido da plataforma"
              value={draft.site_name}
              onChange={(e) => setDraft((d) => ({ ...d, site_name: e.target.value }))}
              required
            />
            <Field
              label="Slogan / texto institucional"
              value={draft.institutional_tagline}
              onChange={(e) => setDraft((d) => ({ ...d, institutional_tagline: e.target.value }))}
            />
          </div>

          <div className="adm-brand-assets">
            <div className="adm-asset-box">
              <img src={draft.logo_url || studfyLogo} alt="Prévia da logo" className="adm-asset-preview" />
              <div>
                <strong>Logo oficial</strong>
                <div className="adm-btn-group">
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={handleUpload('logo')} />
                  <Button type="button" variant="secondary" size="sm" loading={uploadingKind === 'logo'} onClick={() => logoInputRef.current?.click()}>
                    <ImagePlus size={15} /> Enviar logo
                  </Button>
                  {draft.logo_url && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, logo_url: '' }))}>
                      Padrão
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="adm-asset-box">
              <img src={draft.favicon_url || '/studfy-logo.png'} alt="Prévia do favicon" className="adm-asset-preview" />
              <div>
                <strong>Favicon do navegador</strong>
                <div className="adm-btn-group">
                  <input ref={faviconInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="sr-only" onChange={handleUpload('favicon')} />
                  <Button type="button" variant="secondary" size="sm" loading={uploadingKind === 'favicon'} onClick={() => faviconInputRef.current?.click()}>
                    <ImagePlus size={15} /> Enviar favicon
                  </Button>
                  {draft.favicon_url && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, favicon_url: '' }))}>
                      Padrão
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="adm-color-row">
            <div className="field">
              <label className="field-label" htmlFor="adm-primary-color">
                Cor principal
              </label>
              <div className="adm-color-input">
                <input
                  id="adm-primary-color"
                  type="color"
                  value={draft.primary_color}
                  onChange={(e) => setDraft((d) => ({ ...d, primary_color: e.target.value }))}
                />
                <input
                  className="input"
                  value={draft.primary_color}
                  onChange={(e) => setDraft((d) => ({ ...d, primary_color: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="adm-accent-color">
                Cor de destaque
              </label>
              <div className="adm-color-input">
                <input
                  id="adm-accent-color"
                  type="color"
                  value={draft.accent_color}
                  onChange={(e) => setDraft((d) => ({ ...d, accent_color: e.target.value }))}
                />
                <input
                  className="input"
                  value={draft.accent_color}
                  onChange={(e) => setDraft((d) => ({ ...d, accent_color: e.target.value }))}
                />
              </div>
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={resetColors}>
              <RotateCcw size={15} /> Restaurar roxo padrão
            </Button>
          </div>
        </section>

        <section className="card dash-section">
          <div className="section-head">
            <div>
              <h3>Página inicial (Landing)</h3>
              <p className="section-sub">Textos principais e seções visíveis aos visitantes.</p>
            </div>
          </div>

          <div className="adm-form-grid">
            <Field label="Selo superior (Eyebrow)" value={draft.hero_eyebrow} onChange={(e) => setDraft((d) => ({ ...d, hero_eyebrow: e.target.value }))} />
            <Field label="Texto do botão principal" value={draft.hero_cta_text} onChange={(e) => setDraft((d) => ({ ...d, hero_cta_text: e.target.value }))} />
          </div>

          <Field label="Título principal" value={draft.hero_title} onChange={(e) => setDraft((d) => ({ ...d, hero_title: e.target.value }))} />

          <div className="field">
            <label className="field-label" htmlFor="adm-hero-subtitle">
              Subtítulo de apresentação
            </label>
            <textarea
              id="adm-hero-subtitle"
              className="input adm-textarea"
              rows={3}
              value={draft.hero_subtitle}
              onChange={(e) => setDraft((d) => ({ ...d, hero_subtitle: e.target.value }))}
            />
          </div>

          <div className="adm-toggles-row">
            <label className="adm-checkbox">
              <input type="checkbox" checked={draft.show_how_it_works} onChange={(e) => setDraft((d) => ({ ...d, show_how_it_works: e.target.checked }))} />
              <span>Exibir seção "Como funciona"</span>
            </label>
            <label className="adm-checkbox">
              <input type="checkbox" checked={draft.show_features} onChange={(e) => setDraft((d) => ({ ...d, show_features: e.target.checked }))} />
              <span>Exibir seção "Recursos"</span>
            </label>
            <label className="adm-checkbox">
              <input type="checkbox" checked={draft.show_cta} onChange={(e) => setDraft((d) => ({ ...d, show_cta: e.target.checked }))} />
              <span>Exibir chamada final (CTA)</span>
            </label>
          </div>
        </section>

        <section className="card dash-section">
          <div className="section-head">
            <div>
              <h3>Avisos globais e manutenção</h3>
              <p className="section-sub">Comunique novidades ou bloqueie temporariamente o acesso de alunos.</p>
            </div>
          </div>

          <div className="adm-form-stack">
            <label className="adm-checkbox">
              <input type="checkbox" checked={draft.announcement_enabled} onChange={(e) => setDraft((d) => ({ ...d, announcement_enabled: e.target.checked }))} />
              <span>Exibir aviso global na página inicial e no painel</span>
            </label>
            <Field
              label="Texto do aviso global"
              placeholder="Ex.: Simulado nacional neste domingo às 14h!"
              value={draft.announcement_text}
              onChange={(e) => setDraft((d) => ({ ...d, announcement_text: e.target.value }))}
            />

            <label className="adm-checkbox">
              <input type="checkbox" checked={draft.maintenance_mode} onChange={(e) => setDraft((d) => ({ ...d, maintenance_mode: e.target.checked }))} />
              <span>Ativar modo de manutenção (administradores continuam com acesso)</span>
            </label>
            <Field
              label="Mensagem de manutenção"
              value={draft.maintenance_message}
              onChange={(e) => setDraft((d) => ({ ...d, maintenance_message: e.target.value }))}
            />
          </div>
        </section>

        <div className="profile-form-actions">
          <Button type="submit" size="lg" loading={saving} disabled={saving}>
            Salvar personalização
          </Button>
        </div>
      </form>
    </div>
  );
}
