import { ApiNetworkError } from './apiErrors';
import {
  loadSnapshot,
  saveSnapshot,
  type SnapshotIdentity
} from './offlineStore';
import { clearOfflineReadSource, recordOfflineReadSource } from './offlineReadState';
import { hasFreshOfflineSession, isAuthenticated, sessionOwnerId } from './session';

export interface OfflineQueryResult<T> {
  data: T;
  source: 'remote' | 'snapshot';
  savedAt: string;
}

let lastRequestStartedAt = 0;

function nextRequestStartedAt(): number {
  const now = typeof performance === 'undefined'
    ? Date.now()
    : performance.timeOrigin + performance.now();
  lastRequestStartedAt = Math.max(now, lastRequestStartedAt + 0.001);
  return lastRequestStartedAt;
}

export async function loadConfirmedOrSnapshot<T>(
  identity: Omit<SnapshotIdentity, 'ownerId'>,
  loadRemote: () => Promise<unknown>,
  validate: (value: unknown) => value is T
): Promise<OfflineQueryResult<T>> {
  const ownerId = sessionOwnerId();
  if (!ownerId || !isAuthenticated()) {
    throw new Error('A sessão expirou. Entre novamente para acessar os dados deste aparelho.');
  }
  const partition = { ...identity, ownerId };
  const assertActiveIdentity = () => {
    if (!isAuthenticated() || sessionOwnerId() !== ownerId) {
      throw new Error('A sessão ativa mudou. Entre novamente para acessar estes dados.');
    }
  };

  const local = async (networkError?: ApiNetworkError): Promise<OfflineQueryResult<T>> => {
    if (!hasFreshOfflineSession()) {
      throw new Error('A sessão offline expirou. Entre novamente para continuar.');
    }
    const snapshot = await loadSnapshot<T>(partition);
    assertActiveIdentity();
    if (!hasFreshOfflineSession()) {
      throw new Error('A sessão offline expirou. Entre novamente para continuar.');
    }
    if (!snapshot || !validate(snapshot.payload)) {
      if (networkError) throw networkError;
      throw new Error('Nenhum dado confirmado está salvo neste aparelho.');
    }
    recordOfflineReadSource(partition, snapshot.savedAt);
    return { data: snapshot.payload, source: 'snapshot', savedAt: snapshot.savedAt };
  };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return local();
  }

  const requestStartedAt = nextRequestStartedAt();
  let payload: unknown;
  try {
    payload = await loadRemote();
  } catch (error) {
    if (error instanceof ApiNetworkError) return local(error);
    throw error;
  }
  assertActiveIdentity();
  if (!validate(payload)) {
    throw new Error('A resposta recebida não corresponde ao contrato esperado.');
  }
  const snapshot = await saveSnapshot(partition, payload, new Date(), requestStartedAt);
  assertActiveIdentity();
  if (!validate(snapshot.payload)) {
    throw new Error('A resposta salva não corresponde ao contrato esperado.');
  }
  clearOfflineReadSource(partition);
  return { data: snapshot.payload, source: 'remote', savedAt: snapshot.savedAt };
}
