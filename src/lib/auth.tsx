import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile, ProfileUpdate } from '../types/database';
import { logAuthEvent } from './adminApi';
import { getAuthRedirectUrl, supabase } from './supabase';
import { translateAuthError } from './authErrors';
import { removeKey } from './storage';

export type AuthActionResult = { ok: true } | { ok: false; error: string };
export type SignUpResult = { ok: true; needsEmailConfirmation: boolean } | { ok: false; error: string };
export type ProfileUpdateResult = { ok: true; profile: Profile } | { ok: false; error: string };

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  isRecovery: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (fullName: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
  resendConfirmation: (email: string) => Promise<AuthActionResult>;
  refreshProfile: () => Promise<Profile | null>;
  updateProfile: (patch: Pick<ProfileUpdate, 'full_name' | 'username' | 'avatar_url' | 'onboarding_completed'>) => Promise<ProfileUpdateResult>;
  uploadAvatar: (file: File) => Promise<ProfileUpdateResult>;
  removeAvatar: () => Promise<ProfileUpdateResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function clearLegacyLocalAuth(): void {
  removeKey('users');
  removeKey('session');
}

async function fetchOrCreateProfile(authUser: User): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!error && data) return data;

  if (!error && !data) {
    const rawName = typeof authUser.user_metadata?.full_name === 'string' ? normalizeName(authUser.user_metadata.full_name) : null;
    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: authUser.id, full_name: rawName || null })
      .select('*')
      .single();

    if (!insertError && created) return created;
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  const activeUserIdRef = useRef<string | null>(null);

  const forceLocalClear = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    activeUserIdRef.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsRecovery(false);
  }, []);

  const loadProfileForUser = useCallback(
    async (authUser: User | null): Promise<Profile | null> => {
      if (!authUser) {
        setProfile(null);
        return null;
      }
      const fetched = await fetchOrCreateProfile(authUser);
      if (activeUserIdRef.current !== authUser.id) return null;

      if (fetched?.status === 'suspended') {
        await forceLocalClear();
        return null;
      }

      setProfile(fetched);
      return fetched;
    },
    [forceLocalClear],
  );

  useEffect(() => {
    clearLegacyLocalAuth();

    let mounted = true;

    async function initSession() {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (initialSession?.user) {
          // Valida que a sessão ainda existe e não foi revogada remotamente.
          const { data: serverCheck, error: checkErr } = await supabase.auth.getUser();
          if (!mounted) return;
          if (checkErr || !serverCheck.user) {
            await forceLocalClear();
            return;
          }
          activeUserIdRef.current = serverCheck.user.id;
          setSession(initialSession);
          setUser(serverCheck.user);
          await loadProfileForUser(serverCheck.user);
        } else {
          activeUserIdRef.current = null;
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      const nextUser = nextSession?.user ?? null;
      const previousUserId = activeUserIdRef.current;
      activeUserIdRef.current = nextUser?.id ?? null;

      setSession(nextSession);
      setUser(nextUser);

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      } else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setIsRecovery(false);
      }

      if (!nextUser) {
        setProfile(null);
        return;
      }

      if (nextUser.id !== previousUserId || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        window.setTimeout(() => {
          if (mounted && activeUserIdRef.current === nextUser.id) {
            void loadProfileForUser(nextUser);
          }
        }, 0);
      }
    });

    // Detecta encerramento remoto de sessão ou suspensão ao retornar para a aba.
    const onFocus = () => {
      if (!activeUserIdRef.current) return;
      void (async () => {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted) return;
        if (error || !data.user) {
          await forceLocalClear();
          return;
        }
        await loadProfileForUser(data.user);
      })();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [forceLocalClear, loadProfileForUser]);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!user) {
      setProfile(null);
      return null;
    }
    return loadProfileForUser(user);
  }, [loadProfileForUser, user]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      const cleanEmail = normalizeEmail(email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const isBanned = (error.message ?? '').toLowerCase().includes('banned');
        void logAuthEvent({
          event_type: 'login_failed',
          email: cleanEmail,
          reason: isBanned ? 'account_suspended' : error.code ?? 'invalid_credentials',
        });
        if (isBanned) {
          return { ok: false, error: 'Esta conta está temporariamente suspensa pela administração.' };
        }
        return { ok: false, error: translateAuthError(error, 'Não foi possível entrar. Tente novamente.') };
      }

      if (data.user) {
        activeUserIdRef.current = data.user.id;
        setSession(data.session);
        setUser(data.user);
        const fetched = await loadProfileForUser(data.user);
        if (!fetched && activeUserIdRef.current === null) {
          return { ok: false, error: 'Esta conta está temporariamente suspensa pela administração.' };
        }
        void logAuthEvent({
          event_type: 'login_success',
          email: data.user.email ?? cleanEmail,
          accessToken: data.session?.access_token,
        });
      }

      return { ok: true };
    },
    [loadProfileForUser],
  );

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (fullName, email, password) => {
      const cleanName = normalizeName(fullName);
      const cleanEmail = normalizeEmail(email);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
          emailRedirectTo: getAuthRedirectUrl('/entrar'),
        },
      });

      if (error) {
        return { ok: false, error: translateAuthError(error, 'Não foi possível criar sua conta. Tente novamente.') };
      }

      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          ok: false,
          error: 'Já existe uma conta cadastrada com este e-mail. Tente entrar ou recuperar sua senha.',
        };
      }

      void logAuthEvent({
        event_type: 'signup',
        email: cleanEmail,
        accessToken: data.session?.access_token,
      });

      if (data.session && data.user) {
        activeUserIdRef.current = data.user.id;
        setSession(data.session);
        setUser(data.user);
        await loadProfileForUser(data.user);
        return { ok: true, needsEmailConfirmation: false };
      }

      return { ok: true, needsEmailConfirmation: true };
    },
    [loadProfileForUser],
  );

  const signOut = useCallback(async () => {
    const token = session?.access_token;
    const email = user?.email;
    if (token) {
      await logAuthEvent({ event_type: 'logout', email, accessToken: token });
    }
    await supabase.auth.signOut();
    activeUserIdRef.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsRecovery(false);
  }, [session?.access_token, user?.email]);

  const resetPassword = useCallback<AuthContextValue['resetPassword']>(async (email) => {
    const cleanEmail = normalizeEmail(email);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: getAuthRedirectUrl('/redefinir-senha'),
    });

    if (error) {
      return { ok: false, error: translateAuthError(error, 'Não foi possível enviar o e-mail de recuperação.') };
    }

    void logAuthEvent({ event_type: 'password_reset_request', email: cleanEmail });
    return { ok: true };
  }, []);

  const updatePassword = useCallback<AuthContextValue['updatePassword']>(
    async (newPassword) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        return { ok: false, error: translateAuthError(error, 'Não foi possível atualizar sua senha.') };
      }

      void logAuthEvent({
        event_type: 'password_updated',
        email: user?.email,
        accessToken: session?.access_token,
      });
      setIsRecovery(false);
      return { ok: true };
    },
    [session?.access_token, user?.email],
  );

  const resendConfirmation = useCallback<AuthContextValue['resendConfirmation']>(async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizeEmail(email),
      options: {
        emailRedirectTo: getAuthRedirectUrl('/entrar'),
      },
    });

    if (error) {
      return { ok: false, error: translateAuthError(error, 'Não foi possível reenviar o e-mail de confirmação.') };
    }

    return { ok: true };
  }, []);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(
    async (patch) => {
      if (!user) {
        return { ok: false, error: 'Você precisa estar conectado para atualizar seu perfil.' };
      }

      const sanitized: ProfileUpdate = {};
      if ('full_name' in patch) {
        sanitized.full_name = patch.full_name ? normalizeName(patch.full_name) : null;
      }
      if ('username' in patch) {
        const cleanUsername = patch.username?.trim().toLowerCase() ?? '';
        sanitized.username = cleanUsername || null;
      }
      if ('avatar_url' in patch) {
        sanitized.avatar_url = patch.avatar_url?.trim() || null;
      }
      if ('onboarding_completed' in patch) {
        sanitized.onboarding_completed = patch.onboarding_completed;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(sanitized)
        .eq('id', user.id)
        .select('*')
        .single();

      if (error || !data) {
        return { ok: false, error: translateAuthError(error, 'Não foi possível salvar as alterações do perfil.') };
      }

      if ('full_name' in sanitized && sanitized.full_name) {
        void supabase.auth.updateUser({ data: { full_name: sanitized.full_name } });
      }

      setProfile(data);
      return { ok: true, profile: data };
    },
    [user],
  );

  const uploadAvatar = useCallback<AuthContextValue['uploadAvatar']>(
    async (file) => {
      if (!user) {
        return { ok: false, error: 'Você precisa estar conectado para alterar sua foto.' };
      }
      if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        return { ok: false, error: 'Formato inválido. Envie uma imagem JPG, PNG ou WebP.' };
      }
      if (file.size > MAX_AVATAR_BYTES) {
        return { ok: false, error: 'A imagem deve ter no máximo 2 MB.' };
      }

      const ext = extensionForMime(file.type);
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600',
      });

      if (uploadError) {
        return { ok: false, error: translateAuthError(uploadError, 'Não foi possível enviar a foto de perfil.') };
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const cacheBustedUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      return updateProfile({ avatar_url: cacheBustedUrl });
    },
    [updateProfile, user],
  );

  const removeAvatar = useCallback<AuthContextValue['removeAvatar']>(async () => {
    if (!user) {
      return { ok: false, error: 'Você precisa estar conectado para remover sua foto.' };
    }

    const { data: files } = await supabase.storage.from('avatars').list(user.id);
    if (files && files.length > 0) {
      await supabase.storage.from('avatars').remove(files.map((f) => `${user.id}/${f.name}`));
    }

    return updateProfile({ avatar_url: null });
  }, [updateProfile, user]);

  const isAdmin = useMemo(
    () => Boolean(profile?.role === 'admin' && profile?.status === 'active' && user?.app_metadata?.role === 'admin'),
    [profile?.role, profile?.status, user?.app_metadata?.role],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      isAdmin,
      loading,
      isRecovery,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      resendConfirmation,
      refreshProfile,
      updateProfile,
      uploadAvatar,
      removeAvatar,
    }),
    [
      user,
      session,
      profile,
      isAdmin,
      loading,
      isRecovery,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      resendConfirmation,
      refreshProfile,
      updateProfile,
      uploadAvatar,
      removeAvatar,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

export function getDisplayName(profile: Profile | null, user: User | null): string {
  const fromProfile = profile?.full_name?.trim();
  if (fromProfile) return fromProfile;
  const fromMeta = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
  if (fromMeta) return fromMeta;
  return user?.email?.split('@')[0] ?? 'Estudante';
}
