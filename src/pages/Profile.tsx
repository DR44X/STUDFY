import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AlertCircle, Camera, CheckCircle2, KeyRound, Trash2, UserRound } from 'lucide-react';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { PasswordMeter } from '../components/PasswordMeter';
import { getDisplayName, useAuth } from '../lib/auth';
import { useForm } from '../lib/useForm';
import { validateConfirm, validateName, validatePassword, validateUsername } from '../lib/validation';

const PROFILE_VALIDATORS = {
  fullName: validateName,
  username: validateUsername,
};

const PASSWORD_VALIDATORS = {
  password: validatePassword,
  confirm: (v: string, all: { password: string }) => validateConfirm(all.password, v),
};

export default function Profile() {
  const { user, profile, isAdmin, updateProfile, uploadAvatar, removeAvatar, updatePassword } = useAuth();
  const displayName = getDisplayName(profile, user);
  const initial = (displayName.trim()[0] ?? 'E').toUpperCase();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const profileForm = useForm(
    {
      fullName: profile?.full_name ?? displayName,
      username: profile?.username ?? '',
    },
    PROFILE_VALIDATORS,
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const passwordForm = useForm({ password: '', confirm: '' }, PASSWORD_VALIDATORS);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!profile) return;
    profileForm.setValues({
      fullName: profile.full_name ?? '',
      username: profile.username ?? '',
    });
    // Sincroniza apenas quando o perfil remoto mudar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.full_name, profile?.username]);

  const handleAvatarSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || avatarBusy) return;

    setAvatarBusy(true);
    setAvatarFeedback(null);
    const result = await uploadAvatar(file);
    setAvatarBusy(false);

    if (!result.ok) {
      setAvatarFeedback({ type: 'error', text: result.error });
      return;
    }

    setAvatarFeedback({ type: 'success', text: 'Foto de perfil atualizada com sucesso.' });
  };

  const handleAvatarRemove = async () => {
    if (avatarBusy || !profile?.avatar_url) return;
    setAvatarBusy(true);
    setAvatarFeedback(null);
    const result = await removeAvatar();
    setAvatarBusy(false);

    if (!result.ok) {
      setAvatarFeedback({ type: 'error', text: result.error });
      return;
    }

    setAvatarFeedback({ type: 'success', text: 'Foto de perfil removida.' });
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (savingProfile) return;
    setProfileFeedback(null);
    if (!profileForm.validate()) return;

    setSavingProfile(true);
    const result = await updateProfile({
      full_name: profileForm.values.fullName,
      username: profileForm.values.username || null,
    });
    setSavingProfile(false);

    if (!result.ok) {
      setProfileFeedback({ type: 'error', text: result.error });
      return;
    }

    setProfileFeedback({ type: 'success', text: 'Dados do perfil salvos com sucesso.' });
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (savingPassword) return;
    setPasswordFeedback(null);
    if (!passwordForm.validate()) return;

    setSavingPassword(true);
    const result = await updatePassword(passwordForm.values.password);
    setSavingPassword(false);

    if (!result.ok) {
      setPasswordFeedback({ type: 'error', text: result.error });
      return;
    }

    passwordForm.setValues({ password: '', confirm: '' });
    setPasswordFeedback({ type: 'success', text: 'Senha atualizada com sucesso.' });
  };

  return (
    <div className="profile-page">
      <header className="page-head">
        <div>
          <p className="page-date">Conta e identidade</p>
          <h1>Meu perfil</h1>
        </div>
        {isAdmin && <span className="tag tag-brand">Administrador</span>}
      </header>

      <div className="profile-grid">
        {/* Cartão de foto + dados do perfil */}
        <section className="card dash-section" aria-labelledby="profile-info-heading">
          <div className="section-head">
            <div>
              <h2 id="profile-info-heading">Dados pessoais</h2>
              <p className="section-sub">Essas informações aparecem na sua conta do Studfy.</p>
            </div>
            <UserRound size={18} className="profile-section-icon" aria-hidden="true" />
          </div>

          <div className="profile-avatar-row">
            <div className="profile-avatar-lg" aria-hidden="true">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={`Foto de ${displayName}`} />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="profile-avatar-actions">
              <div className="profile-avatar-buttons">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleAvatarSelect}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={avatarBusy}
                  disabled={avatarBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={15} /> {profile?.avatar_url ? 'Trocar foto' : 'Enviar foto'}
                </Button>
                {profile?.avatar_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={avatarBusy}
                    onClick={handleAvatarRemove}
                  >
                    <Trash2 size={15} /> Remover
                  </Button>
                )}
              </div>
              <p className="field-hint">JPG, PNG ou WebP com até 2 MB.</p>
            </div>
          </div>

          {avatarFeedback && (
            <div
              className={`alert ${avatarFeedback.type === 'success' ? 'alert-success' : 'alert-error'} profile-alert`}
              role={avatarFeedback.type === 'error' ? 'alert' : 'status'}
            >
              {avatarFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{avatarFeedback.text}</span>
            </div>
          )}

          <form className="profile-form" onSubmit={handleProfileSubmit} noValidate>
            {profileFeedback && (
              <div
                className={`alert ${profileFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`}
                role={profileFeedback.type === 'error' ? 'alert' : 'status'}
              >
                {profileFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{profileFeedback.text}</span>
              </div>
            )}

            <Field label="Nome completo" autoComplete="name" placeholder="Seu nome" {...profileForm.bind('fullName')} />

            <Field
              label="Nome de usuário"
              placeholder="ex.: maria.silva"
              hint="Opcional. Entre 3 e 30 caracteres (letras minúsculas, números, ponto ou underline)."
              {...profileForm.bind('username')}
            />

            <div className="field">
              <div className="field-label">
                <label htmlFor="profile-email">E-mail</label>
                {user?.email_confirmed_at && <span className="tag tag-success">Confirmado</span>}
              </div>
              <input id="profile-email" className="input" type="email" value={user?.email ?? ''} disabled readOnly />
            </div>

            <div className="profile-form-actions">
              <Button type="submit" loading={savingProfile} disabled={savingProfile}>
                Salvar alterações
              </Button>
            </div>
          </form>
        </section>

        {/* Cartão de segurança / atualização de senha */}
        <section className="card dash-section" aria-labelledby="profile-security-heading">
          <div className="section-head">
            <div>
              <h2 id="profile-security-heading">Segurança</h2>
              <p className="section-sub">Atualize sua senha sempre que achar necessário.</p>
            </div>
            <KeyRound size={18} className="profile-section-icon" aria-hidden="true" />
          </div>

          <form className="profile-form" onSubmit={handlePasswordSubmit} noValidate>
            {passwordFeedback && (
              <div
                className={`alert ${passwordFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`}
                role={passwordFeedback.type === 'error' ? 'alert' : 'status'}
              >
                {passwordFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{passwordFeedback.text}</span>
              </div>
            )}

            <Field
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              hint={
                passwordForm.values.password ? (
                  <PasswordMeter password={passwordForm.values.password} />
                ) : (
                  'Use pelo menos 8 caracteres, com letras e números.'
                )
              }
              {...passwordForm.bind('password')}
            />

            <Field
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              {...passwordForm.bind('confirm')}
            />

            <div className="profile-form-actions">
              <Button type="submit" variant="secondary" loading={savingPassword} disabled={savingPassword}>
                Atualizar senha
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
