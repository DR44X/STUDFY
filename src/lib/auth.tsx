import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { readJSON, removeKey, writeJSON } from './storage';

/**
 * Autenticação local da primeira versão: contas ficam armazenadas neste navegador,
 * com senha protegida por hash + salt. Não há servidor nem envio de e-mails.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface StoredUser extends User {
  salt: string;
  hash: string;
}

type Result = { ok: true } | { ok: false; error: string; field?: 'email' | 'password' };

interface AuthContextValue {
  user: User | null;
  register: (name: string, email: string, password: string) => Promise<Result>;
  login: (email: string, password: string) => Promise<Result>;
  logout: () => void;
  accountExists: (email: string) => boolean;
  resetPassword: (email: string, password: string) => Promise<Result>;
}

const USERS_KEY = 'users';
const SESSION_KEY = 'session';

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  if (crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Contextos não seguros (ex.: acesso por IP na rede local) não expõem crypto.subtle.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (const byte of data) {
    h1 = Math.imul(h1 ^ byte, 16777619);
    h2 = Math.imul(h2 ^ byte, 2246822507);
  }
  return `f${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

function toPublic(u: StoredUser): User {
  return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>(() => readJSON<StoredUser[]>(USERS_KEY, []));
  const [sessionId, setSessionId] = useState<string | null>(() => readJSON<string | null>(SESSION_KEY, null));

  const saveUsers = useCallback((next: StoredUser[]) => {
    setUsers(next);
    writeJSON(USERS_KEY, next);
  }, []);

  const startSession = useCallback((id: string) => {
    setSessionId(id);
    writeJSON(SESSION_KEY, id);
  }, []);

  const findByEmail = useCallback(
    (email: string) => users.find((u) => u.email === normalizeEmail(email)),
    [users],
  );

  const register = useCallback<AuthContextValue['register']>(
    async (name, email, password) => {
      if (findByEmail(email)) {
        return { ok: false, field: 'email', error: 'Já existe uma conta com este e-mail. Tente entrar.' };
      }
      const salt = randomHex();
      const stored: StoredUser = {
        id: randomHex(8),
        name: name.trim().replace(/\s+/g, ' '),
        email: normalizeEmail(email),
        createdAt: new Date().toISOString(),
        salt,
        hash: await hashPassword(password, salt),
      };
      saveUsers([...users, stored]);
      startSession(stored.id);
      return { ok: true };
    },
    [findByEmail, saveUsers, startSession, users],
  );

  const login = useCallback<AuthContextValue['login']>(
    async (email, password) => {
      const found = findByEmail(email);
      if (!found || (await hashPassword(password, found.salt)) !== found.hash) {
        return { ok: false, error: 'E-mail ou senha incorretos. Confira os dados e tente novamente.' };
      }
      startSession(found.id);
      return { ok: true };
    },
    [findByEmail, startSession],
  );

  const logout = useCallback(() => {
    setSessionId(null);
    removeKey(SESSION_KEY);
  }, []);

  const accountExists = useCallback((email: string) => Boolean(findByEmail(email)), [findByEmail]);

  const resetPassword = useCallback<AuthContextValue['resetPassword']>(
    async (email, password) => {
      const found = findByEmail(email);
      if (!found) return { ok: false, field: 'email', error: 'Não encontramos uma conta com este e-mail.' };
      const salt = randomHex();
      const hash = await hashPassword(password, salt);
      saveUsers(users.map((u) => (u.id === found.id ? { ...u, salt, hash } : u)));
      return { ok: true };
    },
    [findByEmail, saveUsers, users],
  );

  const user = useMemo(() => {
    const found = users.find((u) => u.id === sessionId);
    return found ? toPublic(found) : null;
  }, [users, sessionId]);

  const value = useMemo(
    () => ({ user, register, login, logout, accountExists, resetPassword }),
    [user, register, login, logout, accountExists, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
