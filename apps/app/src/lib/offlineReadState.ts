import type { SnapshotIdentity } from './offlineStore';

export const ACCOUNT_SNAPSHOT_WORKSPACE = '@account';

export interface OfflineReadSource extends SnapshotIdentity {
  source: 'snapshot';
  savedAt: string;
}

const sources = new Map<string, OfflineReadSource>();
const listeners = new Set<() => void>();
let snapshot: OfflineReadSource[] = [];

function identityKey(identity: SnapshotIdentity): string {
  const query = Object.entries(identity.query ?? {})
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([
    identity.ownerId,
    identity.workspaceId,
    identity.resource.trim().toLowerCase(),
    query,
    identity.root?.trim() ?? '',
    identity.contractVersion
  ]);
}

function publish(): void {
  snapshot = [...sources.values()];
  listeners.forEach((listener) => listener());
}

export function recordOfflineReadSource(identity: SnapshotIdentity, savedAt: string): void {
  sources.set(identityKey(identity), { ...identity, source: 'snapshot', savedAt });
  publish();
}

export function clearOfflineReadSource(identity: SnapshotIdentity): void {
  if (!sources.delete(identityKey(identity))) return;
  publish();
}

export function getOfflineReadSources(): OfflineReadSource[] {
  return snapshot;
}

export function subscribeOfflineReadSources(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetOfflineReadSources(): void {
  if (sources.size === 0 && snapshot.length === 0) return;
  sources.clear();
  publish();
}
