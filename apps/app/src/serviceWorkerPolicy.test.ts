import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('service worker privacy policy', () => {
  it('never writes a navigated private API response into the app-shell cache', async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    const cachePut = vi.fn();
    const cacheOpen = vi.fn().mockResolvedValue({ put: cachePut });
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, clone: vi.fn() });
    const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

    runInNewContext(source, {
      URL,
      Promise,
      self: {
        location: { origin: 'https://app.example.test' },
        clients: { claim: vi.fn() },
        skipWaiting: vi.fn(),
        addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener)
      },
      caches: { open: cacheOpen, keys: vi.fn(), match: vi.fn(), delete: vi.fn() },
      fetch: fetchMock
    });

    let responsePromise: Promise<unknown> | undefined;
    listeners.get('fetch')?.({
      request: { method: 'GET', mode: 'navigate', url: 'https://app.example.test/api/private' },
      respondWith: (value: Promise<unknown>) => { responsePromise = value; }
    });
    await responsePromise;

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://app.example.test/api/private' }),
      { cache: 'no-store' }
    );
    expect(cacheOpen).not.toHaveBeenCalled();
    expect(cachePut).not.toHaveBeenCalled();
  });
});
