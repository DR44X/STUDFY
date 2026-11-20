import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
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
  const { register } = useAuth();
  const navigate = useNavigate();
  const { values, bind, validate } = useForm({ name: '', email: '', password: '', confirm: '' }, VALIDATORS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    const result = await register(values.name, values.email, values.password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/onboarding', { replace: true });
  };

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
              {error} {error.includes('entrar') && <Link to="/entrar" state={{ email: values.email }}>Ir para o login</Link>}
            </span>
          </div>
        )}
        <Field label="Nome" autoComplete="name" placeholder="Como podemos te chamar?" {...bind('name')} />
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
        <Button type="submit" size="lg" block loading={loading}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
