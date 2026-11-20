import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { AuthLayout } from '../../components/AuthLayout';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { PasswordMeter } from '../../components/PasswordMeter';
import { useAuth } from '../../lib/auth';
import { useForm } from '../../lib/useForm';
import { validateConfirm, validateEmail, validateName, validatePassword } from '../../lib/validation';

const VALIDATORS = {
  name: validateName,
  email: validateEmail,
  password: validatePassword,
  confirm: (v: string, all: { password: string }) => validateConfirm(all.password, v),
};

export default function Register() {
  const { signUp, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const { values, bind, validate } = useForm({ name: '', email: '', password: '', confirm: '' }, VALIDATORS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!validate()) return;

    setLoading(true);
    const result = await signUp(values.name, values.email, values.password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setConfirmationEmail(values.email.trim().toLowerCase());
      return;
    }

    navigate('/onboarding', { replace: true });
  };

  const handleResend = async () => {
    if (!confirmationEmail || resending) return;
    setResending(true);
    setError('');
    setResendMessage('');
    const result = await resendConfirmation(confirmationEmail);
    setResending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setResendMessage('Reenviamos o e-mail de confirmação. Confira sua caixa de entrada e o spam.');
  };

  if (confirmationEmail) {
    return (
      <AuthLayout
        title="Confirme seu e-mail"
        subtitle={
          <>
            Enviamos um link de confirmação para <strong>{confirmationEmail}</strong>.
          </>
        }
        footer={
          <>
            Já confirmou? <Link to="/entrar" state={{ email: confirmationEmail }}>Ir para o login</Link>
          </>
        }
      >
        <div className="auth-form">
          <div className="alert alert-info" role="status">
            <Mail size={18} />
            <span>Abra sua caixa de entrada e clique no link enviado para ativar sua conta no Studfy.</span>
          </div>
          {resendMessage && (
            <div className="alert alert-success" role="status">
              <CheckCircle2 size={18} /> <span>{resendMessage}</span>
            </div>
          )}
          {error && (
            <div className="alert alert-error" role="alert">
              <AlertCircle size={18} /> <span>{error}</span>
            </div>
          )}
          <Button type="button" variant="secondary" size="lg" block loading={resending} onClick={handleResend}>
            Reenviar e-mail de confirmação
          </Button>
          <Link to="/entrar" state={{ email: confirmationEmail }} className="btn btn-primary btn-lg btn-block">
            Ir para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const passwordField = bind('password');

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Em poucos minutos você terá um cronograma feito para você."
      footer={
        <>
          Já tem uma conta? <Link to="/entrar">Entrar</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} />
            <span>
              {error}{' '}
              {error.includes('entrar') && (
                <Link to="/entrar" state={{ email: values.email }}>
                  Ir para o login
                </Link>
              )}
            </span>
          </div>
        )}
        <Field label="Nome completo" autoComplete="name" placeholder="Como podemos te chamar?" {...bind('name')} />
        <Field label="E-mail" type="email" autoComplete="email" placeholder="nome@exemplo.com" inputMode="email" {...bind('email')} />
        <Field
          label="Senha"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          hint={values.password ? <PasswordMeter password={values.password} /> : 'Use pelo menos 8 caracteres, com letras e números.'}
          {...passwordField}
        />
        <Field label="Confirmar senha" type="password" autoComplete="new-password" placeholder="Repita a senha" {...bind('confirm')} />
        <Button type="submit" size="lg" block loading={loading} disabled={loading}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
