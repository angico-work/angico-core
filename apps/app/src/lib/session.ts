const SESSION_KEY = 'angico.session';
const SESSION_VALIDATED_KEY = 'angico.session.validatedAt';
const OWNER_ALIAS_PREFIX = 'angico.offlineOwner.';
const OFFLINE_SESSION_LEASE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthSession {
  pessoaId: number;
  nome: string;
  email: string | null;
  angicoId: string | null;
  papel: string | null;
  workspaceId: string | null;
  expiresAt: string;
  csrfToken: string;
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession & { token?: unknown };
    if (Object.prototype.hasOwnProperty.call(session, 'token')) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const session = getSession();
  return Boolean(session && Date.parse(session.expiresAt) > Date.now());
}

export function sessionOwnerId(session = getSession()): string | undefined {
  if (!session) return undefined;
  const key = `${OWNER_ALIAS_PREFIX}${session.pessoaId}`;
  const existing = localStorage.getItem(key)?.trim();
  if (existing) return existing;
  const ownerId = session.angicoId || `pessoa-${session.pessoaId}`;
  localStorage.setItem(key, ownerId);
  return ownerId;
}

export function saveSession(session: AuthSession, validated = false): AuthSession {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session, (key, value) => key === 'token' ? undefined : value));
  if (validated) localStorage.setItem(SESSION_VALIDATED_KEY, new Date().toISOString());
  return session;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_VALIDATED_KEY);
  localStorage.removeItem('angico_session');
}

export function offlineSessionExpiresAt(session = getSession()): number | undefined {
  if (!session) return undefined;
  const validatedAt = Date.parse(localStorage.getItem(SESSION_VALIDATED_KEY) ?? '');
  const serverExpiry = Date.parse(session.expiresAt);
  if (!Number.isFinite(validatedAt) || !Number.isFinite(serverExpiry)) return undefined;
  return Math.min(serverExpiry, validatedAt + OFFLINE_SESSION_LEASE_MS);
}

export function hasFreshOfflineSession(): boolean {
  const expiresAt = offlineSessionExpiresAt();
  return expiresAt !== undefined && Date.now() < expiresAt;
}

export function setSessionWorkspace(slug: string): void {
  const session = getSession();
  if (session) saveSession({ ...session, workspaceId: slug });
}
