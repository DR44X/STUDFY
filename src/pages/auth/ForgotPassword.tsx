import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Info } from 'lucide-react';
import { AuthLayout } from '../../components/AuthLayout';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { PasswordMeter } from '../../components/PasswordMeter';
import { useAuth } from '../../lib/auth';
import { useForm } from '../../lib/useForm';
import { validateConfirm, validateEmail, validatePassword } from '../../lib/validation';

const EMAIL_VALIDATORS = { email: validateEmail };
const RESET_VALIDATORS = {
  password: validatePassword,
  confirm: (v: string, all: { password: string }) => validateConfirm(all.password, v),
};

export default function ForgotPassword() {
  const [email, setEmail] = useState<string | null>(null);

  return email ? <ResetStep email={email} onBack={() => setEmail(null)} /> : <EmailStep onFound={setEmail} />;
}

function EmailStep({ onFound }: { onFound: (email: string) => void }) {
  const { accountExists } = useAuth();
  const { values, bind, validate } = useForm({ email: '' }, EMAIL_VALIDATORS);
  const [error, setError] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    if (!accountExists(values.email)) {
      setError('Não encontramos uma conta com este e-mail neste dispositivo. Confira o endereço ou crie uma conta.');
      return;
    }
    onFound(values.email);
  };

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe o e-mail da sua conta para criar uma nova senha."
      footer={
        <Link to="/entrar" className="auth-back">
          <ArrowLeft size={16} /> Voltar para o login
        </Link>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} /> {error}
          </div>
        )}
        <Field label="E-mail" type="email" autoComplete="email" placeholder="nome@exemplo.com" inputMode="email" {...bind('email')} />
        <Button type="submit" size="lg" block>
          Continuar
        </Button>
        <p className="auth-note">
          <Info size={15} />
          Nesta versão, sua conta fica salva neste navegador. Por isso, a redefinição é feita aqui mesmo, sem envio de e-mail.
        </p>
      </form>
    </AuthLayout>
  );
}

function ResetStep({ email, onBack }: { email: string; onBack: () => void }) {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const { values, bind, validate } = useForm({ password: '', confirm: '' }, RESET_VALIDATORS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    const result = await resetPassword(email, values.password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/entrar', { replace: true, state: { reset: true, email } });
  };

  return (
    <AuthLayout
      title="Crie uma nova senha"
      subtitle={
        <>
          Conta: <strong>{email}</strong>
        </>
      }
      footer={
        <button type="button" className="auth-back" onClick={onBack}>
          <ArrowLeft size={16} /> Usar outro e-mail
        </button>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} /> {error}
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
        <Button type="submit" size="lg" block loading={loading}>
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  );
}
