/** Regras de validação compartilhadas pelos formulários. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-z0-9._]+$/;

export function validateName(name: string): string | undefined {
  const value = name.trim();
  if (!value) return 'Informe seu nome.';
  if (value.length < 2) return 'O nome precisa ter pelo menos 2 letras.';
  if (!/^[\p{L}\s'.-]+$/u.test(value)) return 'Use apenas letras no nome.';
  return undefined;
}

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Informe seu e-mail.';
  if (!EMAIL_RE.test(value)) return 'Digite um e-mail válido, como nome@exemplo.com.';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Crie uma senha.';
  if (password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.';
  return undefined;
}

export function validateConfirm(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Confirme sua senha.';
  if (password !== confirm) return 'As senhas não coincidem.';
  return undefined;
}

export function validateUsername(username: string): string | undefined {
  const value = username.trim().toLowerCase();
  if (!value) return undefined; // Opcional no perfil
  if (value.length < 3 || value.length > 30) {
    return 'O nome de usuário deve ter entre 3 e 30 caracteres.';
  }
  if (!USERNAME_RE.test(value)) {
    return 'Use apenas letras minúsculas, números, ponto (.) ou underline (_).';
  }
  return undefined;
}

/** Valida que um destino de redirecionamento é uma rota interna segura (evita open redirect). */
export function isSafeRedirectPath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3;
  label: string;
}

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '' };
  let points = 0;
  if (password.length >= 8) points++;
  if (password.length >= 12) points++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) points++;
  if (/\d/.test(password)) points++;
  if (/[^A-Za-z0-9]/.test(password)) points++;
  if (points <= 2) return { score: 1, label: 'Fraca' };
  if (points <= 3) return { score: 2, label: 'Boa' };
  return { score: 3, label: 'Forte' };
}
