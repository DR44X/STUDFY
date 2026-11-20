import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../../components/AuthLayout';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { useAuth } from '../../lib/auth';
import { useForm } from '../../lib/useForm';
import { validateEmail } from '../../lib/validation';

const VALIDATORS = {
  email: validateEmail,
  password: (v: string) => (v ? undefined : 'Informe sua senha.'),
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const resetDone = (location.state as { reset?: boolean } | null)?.reset;
  const { values, bind, validate } = useForm({ email: (location.state as { email?: string } | null)?.email ?? '', password: '' }, VALIDATORS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    const result = await login(values.email, values.password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/painel', { replace: true });
  };

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre para continuar seus estudos."
      footer={
        <>
          Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {resetDone && !error && (
          <div className="alert alert-success" role="status">
            <CheckCircle2 size={18} /> Senha redefinida. Entre com a nova senha.
          </div>
        )}
        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} /> {error}
          </div>
        )}
        <Field label="E-mail" type="email" autoComplete="email" placeholder="nome@exemplo.com" inputMode="email" {...bind('email')} />
        <Field
          label="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          labelAside={
            <Link to="/recuperar-senha" className="field-link">
              Esqueceu a senha?
            </Link>
          }
          {...bind('password')}
        />
        <Button type="submit" size="lg" block loading={loading}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
