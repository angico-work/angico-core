import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiHttpError, ApiNetworkError } from './api';
import { loadSnapshot, resetOfflineDatabase, saveSnapshot } from './offlineStore';
import { loadConfirmedOrSnapshot } from './offlineQuery';
import { getOfflineReadSources, resetOfflineReadSources } from './offlineReadState';

const session = {
  pessoaId: 7,
  nome: 'Ana',
  email: 'ana@example.test',
  angicoId: 'ana.sp',
  papel: 'MEMBER',
  workspaceId: 'territorio-a',
  expiresAt: '2099-01-01T00:00:00Z',
  csrfToken: 'csrf-secret'
};

const identity = {
  workspaceId: 'territorio-a',
  resource: 'evidencias',
  query: { subjectId: 42 },
  root: 'OBSERVACAO:42',
  contractVersion: 1
} as const;

function isList(value: unknown): value is Array<{ id: number }> {
  return Array.isArray(value) && value.every((item) => (
    Boolean(item) && typeof item === 'object' && Number.isSafeInteger((item as { id?: unknown }).id)
  ));
}

describe('confirmed response snapshots', () => {
  beforeEach(async () => {
    await resetOfflineDatabase();
    resetOfflineReadSources();
    localStorage.clear();
    localStorage.setItem('angico.session', JSON.stringify(session));
    localStorage.setItem('angico.session.validatedAt', new Date().toISOString());
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.restoreAllMocks();
  });

  it('stores only a validated remote response with its save time', async () => {
    const result = await loadConfirmedOrSnapshot(identity, async () => [{ id: 7 }], isList);

    expect(result).toMatchObject({ data: [{ id: 7 }], source: 'remote' });
    expect(Number.isFinite(Date.parse(result.savedAt))).toBe(true);
    expect(await loadSnapshot({ ...identity, ownerId: 'ana.sp' }))
      .toMatchObject({ payload: [{ id: 7 }], savedAt: result.savedAt });
  });

  it('uses the matching snapshot directly when the browser reports offline', async () => {
    await saveSnapshot({ ...identity, ownerId: 'ana.sp' }, [{ id: 8 }], new Date('2026-07-10T12:00:00Z'));
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const loader = vi.fn();

    const result = await loadConfirmedOrSnapshot(identity, loader, isList);

    expect(loader).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: [{ id: 8 }], source: 'snapshot', savedAt: '2026-07-10T12:00:00.000Z'
    });
    expect(getOfflineReadSources()).toEqual([
      expect.objectContaining({ ownerId: 'ana.sp', workspaceId: 'territorio-a', resource: 'evidencias' })
    ]);
  });

  it('uses a snapshot only for a typed fetch network failure', async () => {
    await saveSnapshot({ ...identity, ownerId: 'ana.sp' }, [{ id: 9 }]);

    const result = await loadConfirmedOrSnapshot(
      identity,
      async () => { throw new ApiNetworkError(new TypeError('Failed to fetch')); },
      isList
    );

    expect(result).toMatchObject({ data: [{ id: 9 }], source: 'snapshot' });
  });

  it.each([401, 403, 404, 409, 422, 500])(
    'never uses a snapshot after HTTP %s',
    async (status) => {
      await saveSnapshot({ ...identity, ownerId: 'ana.sp' }, [{ id: 10 }]);
      const failure = new ApiHttpError(status, `HTTP ${status}`);

      await expect(loadConfirmedOrSnapshot(
        identity,
        async () => { throw failure; },
        isList
      )).rejects.toBe(failure);
    }
  );

  it.each([
    new SyntaxError('invalid json'),
    new TypeError('parse failed'),
    new DOMException('aborted', 'AbortError')
  ])('never uses a snapshot after a parse or abort failure', async (failure) => {
    await saveSnapshot({ ...identity, ownerId: 'ana.sp' }, [{ id: 11 }]);

    await expect(loadConfirmedOrSnapshot(
      identity,
      async () => { throw failure; },
      isList
    )).rejects.toBe(failure);
  });

  it('rejects an invalid remote payload without overwriting confirmed data', async () => {
    await saveSnapshot({ ...identity, ownerId: 'ana.sp' }, [{ id: 12 }]);

    await expect(loadConfirmedOrSnapshot(identity, async () => ({ id: 'invalid' }), isList))
      .rejects.toThrow('contrato');
    expect(await loadSnapshot({ ...identity, ownerId: 'ana.sp' }))
      .toMatchObject({ payload: [{ id: 12 }] });
  });

  it('does not persist a response after another account replaces the active session', async () => {
    let resolveRemote!: (value: unknown) => void;
    const remote = new Promise<unknown>((resolve) => { resolveRemote = resolve; });
    const pending = loadConfirmedOrSnapshot(identity, () => remote, isList);
    await Promise.resolve();
    localStorage.setItem('angico.session', JSON.stringify({
      ...session, pessoaId: 8, angicoId: 'bia.sp'
    }));

    resolveRemote([{ id: 14 }]);

    await expect(pending).rejects.toThrow('sessão ativa mudou');
    expect(await loadSnapshot({ ...identity, ownerId: 'ana.sp' })).toBeUndefined();
    expect(await loadSnapshot({ ...identity, ownerId: 'bia.sp' })).toBeUndefined();
  });

  it('keeps the newest confirmed response when requests finish out of order', async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    const firstRemote = new Promise<unknown>((resolve) => { resolveFirst = resolve; });
    const secondRemote = new Promise<unknown>((resolve) => { resolveSecond = resolve; });
    const first = loadConfirmedOrSnapshot(identity, () => firstRemote, isList);
    const second = loadConfirmedOrSnapshot(identity, () => secondRemote, isList);

    resolveSecond([{ id: 16 }]);
    await expect(second).resolves.toMatchObject({ data: [{ id: 16 }], source: 'remote' });
    resolveFirst([{ id: 15 }]);

    await expect(first).resolves.toMatchObject({ data: [{ id: 16 }], source: 'remote' });
    expect(await loadSnapshot({ ...identity, ownerId: 'ana.sp' }))
      .toMatchObject({ payload: [{ id: 16 }] });
  });

  it('keeps a valid remote response when a newer request falls back to the snapshot', async () => {
    await saveSnapshot(
      { ...identity, ownerId: 'ana.sp' },
      [{ id: 17 }],
      new Date(Date.now() - 60_000)
    );
    let resolveRemote!: (value: unknown) => void;
    const remote = new Promise<unknown>((resolve) => { resolveRemote = resolve; });
    const first = loadConfirmedOrSnapshot(identity, () => remote, isList);
    const second = loadConfirmedOrSnapshot(
      identity,
      async () => { throw new ApiNetworkError(new TypeError('offline')); },
      isList
    );

    await expect(second).resolves.toMatchObject({ data: [{ id: 17 }], source: 'snapshot' });
    resolveRemote([{ id: 18 }]);

    await expect(first).resolves.toMatchObject({ data: [{ id: 18 }], source: 'remote' });
    expect(await loadSnapshot({ ...identity, ownerId: 'ana.sp' }))
      .toMatchObject({ payload: [{ id: 18 }] });
  });

  it('blocks expired sessions without deleting the saved response', async () => {
    await saveSnapshot({ ...identity, ownerId: 'ana.sp' }, [{ id: 13 }]);
    localStorage.setItem('angico.session', JSON.stringify({
      ...session, expiresAt: '2020-01-01T00:00:00Z'
    }));
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

    await expect(loadConfirmedOrSnapshot(identity, vi.fn(), isList)).rejects.toThrow('sessão');
    expect(await loadSnapshot({ ...identity, ownerId: 'ana.sp' }))
      .toMatchObject({ payload: [{ id: 13 }] });
  });
});
