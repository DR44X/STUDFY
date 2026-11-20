import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../../components/AuthLayout';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { PasswordMeter } from '../../components/PasswordMeter';
import { PageLoader } from '../../components/RouteGuards';
import { useAuth } from '../../lib/auth';
import { useForm } from '../../lib/useForm';
import { validateConfirm, validatePassword } from '../../lib/validation';

const VALIDATORS = {
  password: validatePassword,
  confirm: (v: string, all: { password: string }) => validateConfirm(all.password, v),
};

export default function ResetPassword() {
  const { user, loading: authLoading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const { values, bind, validate } = useForm({ password: '', confirm: '' }, VALIDATORS);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (authLoading) return <PageLoader label="Validando link de recuperação..." />;

  if (!user) {
    return (
      <AuthLayout
        title="Link inválido ou expirado"
        subtitle="Solicite um novo link de recuperação para definir uma nova senha."
        footer={
          <Link to="/entrar" className="auth-back">
            <ArrowLeft size={16} /> Voltar para o login
          </Link>
        }
      >
        <div className="auth-form">
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} />
            <span>Não encontramos uma sessão ativa de recuperação. Peça um novo e-mail de redefinição.</span>
          </div>
          <Link to="/recuperar-senha" className="btn btn-primary btn-lg btn-block">
            Solicitar novo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    if (!validate()) return;

    setSaving(true);
    const result = await updatePassword(values.password);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const email = user.email ?? '';
    await signOut();
    navigate('/entrar', { replace: true, state: { reset: true, email } });
  };

  return (
    <AuthLayout
      title="Crie uma nova senha"
      subtitle={
        user.email ? (
          <>
            Conta: <strong>{user.email}</strong>
          </>
        ) : (
          'Escolha uma senha forte para proteger sua conta.'
        )
      }
      footer={
        <Link to="/entrar" className="auth-back">
          <ArrowLeft size={16} /> Voltar para o login
        </Link>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}
        <Field
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          hint={values.password ? <PasswordMeter password={values.password} /> : 'Use pelo menos 8 caracteres, com letras e números.'}
          {...bind('password')}
        />
        <Field label="Confirmar nova senha" type="password" autoComplete="new-password" placeholder="Repita a senha" {...bind('confirm')} />
        <Button type="submit" size="lg" block loading={saving} disabled={saving}>
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  );
}
