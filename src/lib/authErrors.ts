/**
 * Traduz erros do Supabase Auth / PostgREST / Storage para mensagens claras em português.
 */

interface SupabaseErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

export function translateAuthError(error: SupabaseErrorLike | null | undefined, fallback = 'Ocorreu um erro inesperado. Tente novamente.'): string {
  if (!error) return fallback;

  const code = (error.code ?? '').toLowerCase();
  const msg = (error.message ?? '').toLowerCase();

  // Códigos oficiais do Supabase Auth
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Confira seus dados e tente novamente.';
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e clique no link de confirmação.';
  }
  if (code === 'user_already_exists' || msg.includes('user already registered')) {
    return 'Já existe uma conta cadastrada com este e-mail. Tente entrar ou recuperar sua senha.';
  }
  if (code === 'weak_password' || msg.includes('password should be at least')) {
    return 'A senha escolhida é muito fraca. Use pelo menos 8 caracteres com letras e números.';
  }
  if (code === 'same_password' || msg.includes('new password should be different')) {
    return 'A nova senha precisa ser diferente da senha atual.';
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error.status === 429 || msg.includes('rate limit')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';
  }
  if (code === 'email_address_invalid' || msg.includes('unable to validate email address')) {
    return 'Informe um endereço de e-mail válido.';
  }
  if (code === 'signup_disabled') {
    return 'O cadastro de novas contas está temporariamente desativado.';
  }
  if (code === 'session_expired' || code === 'refresh_token_not_found' || msg.includes('auth session missing')) {
    return 'Sua sessão expirou ou o link de recuperação é inválido. Solicite um novo link.';
  }
  if (code === 'otp_expired' || msg.includes('token has expired') || msg.includes('expired')) {
    return 'Este link expirou. Solicite um novo e-mail para continuar.';
  }

  // Erros de banco (Postgres / PostgREST)
  if (code === '23505' || msg.includes('duplicate key') || msg.includes('profiles_username_key')) {
    return 'Este nome de usuário já está em uso. Escolha outro.';
  }
  if (code === '23514' || msg.includes('check constraint')) {
    return 'Os dados informados não atendem aos requisitos esperados. Revise os campos e tente novamente.';
  }
  if (code === '42501' || msg.includes('row-level security')) {
    return 'Você não tem permissão para realizar esta operação.';
  }

  // Erros de rede
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.';
  }

  return fallback;
}
