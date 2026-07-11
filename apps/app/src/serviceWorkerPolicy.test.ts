import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('service worker privacy policy', () => {
  it('precaches every local JavaScript and CSS file reachable from the build manifest', async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    const cacheAddAll = vi.fn().mockResolvedValue(undefined);
    const cacheOpen = vi.fn().mockResolvedValue({ addAll: cacheAddAll });
    const skipWaiting = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        'src/main.tsx': {
          file: 'assets/index-A1.js',
          isEntry: true,
          css: ['assets/index-A1.css'],
          imports: ['_shared.ts'],
          dynamicImports: ['src/pages/MapPage.tsx'],
          assets: ['assets/font-A1.woff2', 'https://cdn.example.test/external.js']
        },
        '_shared.ts': {
          file: '/assets/shared-B2.js',
          assets: ['/assets/shared-B2.css', '/api/export.js']
        },
        'src/pages/MapPage.tsx': {
          file: 'assets/map-C3.js',
          css: ['assets/map-C3.css'],
          dynamicImports: ['src/pages/NestedPage.tsx']
        },
        'src/pages/NestedPage.tsx': {
          file: 'assets/nested-D4.js'
        }
      })
    });
    const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

    runInNewContext(source, {
      URL,
      Promise,
      self: {
        location: { origin: 'https://app.example.test' },
        clients: { claim: vi.fn() },
        skipWaiting,
        addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener)
      },
      caches: { open: cacheOpen, keys: vi.fn(), match: vi.fn(), delete: vi.fn() },
      fetch: fetchMock
    });

    let installPromise: Promise<unknown> | undefined;
    listeners.get('install')?.({
      waitUntil: (value: Promise<unknown>) => { installPromise = value; }
    });
    await installPromise;

    expect(fetchMock).toHaveBeenCalledWith('/asset-manifest.json', { cache: 'no-store' });
    expect(cacheOpen).toHaveBeenCalledWith('angico-cache-v5');
    expect(cacheAddAll).toHaveBeenCalledOnce();
    expect(new Set(cacheAddAll.mock.calls[0][0])).toEqual(new Set([
      '/',
      '/index.html',
      '/manifest.webmanifest',
      '/angico-icone.png',
      '/assets/index-A1.js',
      '/assets/index-A1.css',
      '/assets/shared-B2.js',
      '/assets/shared-B2.css',
      '/assets/map-C3.js',
      '/assets/map-C3.css',
      '/assets/nested-D4.js'
    ]));
    expect(skipWaiting).toHaveBeenCalledOnce();
  });

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
