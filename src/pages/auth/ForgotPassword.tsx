import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { AuthLayout } from '../../components/AuthLayout';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { useAuth } from '../../lib/auth';
import { useForm } from '../../lib/useForm';
import { validateEmail } from '../../lib/validation';

const EMAIL_VALIDATORS = { email: validateEmail };

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { values, bind, validate } = useForm({ email: '' }, EMAIL_VALIDATORS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!validate()) return;

    setLoading(true);
    const result = await resetPassword(values.email);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSentTo(values.email.trim().toLowerCase());
  };

  if (sentTo) {
    return (
      <AuthLayout
        title="Verifique seu e-mail"
        subtitle={
          <>
            Se existir uma conta associada a <strong>{sentTo}</strong>, enviaremos um link para redefinir sua senha.
          </>
        }
        footer={
          <Link to="/entrar" className="auth-back">
            <ArrowLeft size={16} /> Voltar para o login
          </Link>
        }
      >
        <div className="auth-form">
          <div className="alert alert-success" role="status">
            <CheckCircle2 size={18} />
            <span>Link de recuperação solicitado. Confira sua caixa de entrada e a pasta de spam.</span>
          </div>
          <Button type="button" variant="secondary" size="lg" block onClick={() => setSentTo(null)}>
            <Mail size={16} /> Tentar outro e-mail
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe o e-mail da sua conta para receber um link de redefinição."
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
        <Field label="E-mail" type="email" autoComplete="email" placeholder="nome@exemplo.com" inputMode="email" {...bind('email')} />
        <Button type="submit" size="lg" block loading={loading} disabled={loading}>
          Enviar link de recuperação
        </Button>
      </form>
    </AuthLayout>
  );
}
