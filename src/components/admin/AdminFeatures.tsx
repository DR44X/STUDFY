import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Sliders } from 'lucide-react';
import { callAdminApi, type SiteSettingsRow } from '../../lib/adminApi';
import { useSiteConfig } from '../../lib/siteConfig';
import type { SiteFeatures } from '../../types/database';
import { Button } from '../Button';

const FEATURE_ITEMS: { key: keyof SiteFeatures; label: string; description: string; future?: boolean }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Visão geral do aluno, sequência e progresso semanal.' },
  { key: 'schedule', label: 'Cronograma', description: 'Grade semanal de atividades, filtros e reordenação.' },
  { key: 'profile', label: 'Perfil', description: 'Edição de nome, username, foto e senha do aluno.' },
  { key: 'study_history', label: 'Histórico de estudos', description: 'Contabilização de sequência diária e minutos estudados.' },
  { key: 'exams_simulados', label: 'Simulados', description: 'Módulo futuro (em preparação) — sem página ativa ainda.', future: true },
  { key: 'essay_redacao', label: 'Redação', description: 'Módulo futuro (em preparação) — sem página ativa ainda.', future: true },
  { key: 'question_bank', label: 'Banco de questões', description: 'Módulo futuro (em preparação) — sem página ativa ainda.', future: true },
  { key: 'community', label: 'Comunidade', description: 'Módulo futuro (em preparação) — sem página ativa ainda.', future: true },
];

export function AdminFeatures() {
  const { settings, applyLocalSettings } = useSiteConfig();
  const [features, setFeatures] = useState<SiteFeatures>(settings.features);
  const [allowPublicSignup, setAllowPublicSignup] = useState(settings.allow_public_signup);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setFeatures(settings.features);
    setAllowPublicSignup(settings.allow_public_signup);
  }, [settings.allow_public_signup, settings.features]);

  const toggle = (key: keyof SiteFeatures) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await callAdminApi<{ settings: SiteSettingsRow }>('update_site_settings', {
        settings: { features, allow_public_signup: allowPublicSignup },
      });
      applyLocalSettings(res.settings);
      setFeedback({ type: 'success', text: 'Disponibilidade das funcionalidades atualizada.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao atualizar funcionalidades.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-section">
      <div className="adm-section-bar">
        <div>
          <h2>Funcionalidades</h2>
          <p className="section-sub">Habilite ou desabilite módulos do Studfy globalmente para os estudantes.</p>
        </div>
        <Button type="button" loading={saving} disabled={saving} onClick={() => void handleSave()}>
          Salvar alterações
        </Button>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} role="status">
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      <section className="card dash-section">
        <div className="section-head">
          <div>
            <h3>Módulos e acesso público</h3>
            <p className="section-sub">Administradores mantêm acesso ao painel mesmo quando módulos de alunos estão desativados.</p>
          </div>
          <Sliders size={18} className="profile-section-icon" aria-hidden="true" />
        </div>

        <div className="adm-feature-list">
          <label className="adm-feature-row">
            <div>
              <strong>Cadastro público de novos estudantes</strong>
              <span>Permite que novos visitantes criem conta em /cadastro.</span>
            </div>
            <input type="checkbox" checked={allowPublicSignup} onChange={(e) => setAllowPublicSignup(e.target.checked)} />
          </label>

          {FEATURE_ITEMS.map((item) => (
            <label key={item.key} className="adm-feature-row">
              <div>
                <div className="adm-feature-title">
                  <strong>{item.label}</strong>
                  {item.future && <span className="tag">Módulo futuro</span>}
                </div>
                <span>{item.description}</span>
              </div>
              <input type="checkbox" checked={features[item.key]} onChange={() => toggle(item.key)} />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
