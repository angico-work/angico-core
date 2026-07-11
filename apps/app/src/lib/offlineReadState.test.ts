import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOfflineReadSource,
  getOfflineReadSources,
  recordOfflineReadSource,
  resetOfflineReadSources,
  subscribeOfflineReadSources
} from './offlineReadState';

const base = {
  ownerId: 'ana.sp',
  workspaceId: 'territorio-a',
  resource: 'rastro',
  contractVersion: 1
};

describe('offline read source state', () => {
  beforeEach(resetOfflineReadSources);

  it('keeps parallel roots independent and clears only the matching response', () => {
    recordOfflineReadSource({ ...base, root: 'MISSAO:1' }, '2026-07-10T12:00:00Z');
    recordOfflineReadSource({ ...base, root: 'MISSAO:2' }, '2026-07-10T12:01:00Z');

    expect(getOfflineReadSources()).toHaveLength(2);
    clearOfflineReadSource({ ...base, root: 'MISSAO:1' });
    expect(getOfflineReadSources()).toEqual([
      expect.objectContaining({ root: 'MISSAO:2', savedAt: '2026-07-10T12:01:00Z' })
    ]);
  });

  it('does not overwrite another owner or workspace and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOfflineReadSources(listener);

    recordOfflineReadSource(base, '2026-07-10T12:00:00Z');
    recordOfflineReadSource({ ...base, ownerId: 'bia.sp' }, '2026-07-10T12:02:00Z');
    recordOfflineReadSource({ ...base, workspaceId: 'territorio-b' }, '2026-07-10T12:03:00Z');

    expect(getOfflineReadSources()).toHaveLength(3);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
});
