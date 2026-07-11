import { ApiNetworkError } from './apiErrors';
import { loadSnapshot, saveSnapshot, type SnapshotIdentity } from './offlineStore';
import { clearOfflineReadSource, recordOfflineReadSource } from './offlineReadState';
import { hasFreshOfflineSession, isAuthenticated, sessionOwnerId } from './session';

export interface OfflineQueryResult<T> {
  data: T;
  source: 'remote' | 'snapshot';
  savedAt: string;
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

  const local = async (networkError?: ApiNetworkError): Promise<OfflineQueryResult<T>> => {
    if (!hasFreshOfflineSession()) {
      throw new Error('A sessão offline expirou. Entre novamente para continuar.');
    }
    const snapshot = await loadSnapshot<T>(partition);
    if (!snapshot) {
      if (networkError) throw networkError;
      throw new Error('Nenhum dado confirmado está salvo neste aparelho.');
    }
    recordOfflineReadSource(partition, snapshot.savedAt);
    return { data: snapshot.payload, source: 'snapshot', savedAt: snapshot.savedAt };
  };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return local();
  }

  let payload: unknown;
  try {
    payload = await loadRemote();
  } catch (error) {
    if (error instanceof ApiNetworkError) return local(error);
    throw error;
  }
  if (!validate(payload)) {
    throw new Error('A resposta recebida não corresponde ao contrato esperado.');
  }
  const snapshot = await saveSnapshot(partition, payload);
  clearOfflineReadSource(partition);
  return { data: payload, source: 'remote', savedAt: snapshot.savedAt };
}
