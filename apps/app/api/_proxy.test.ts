// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { buildUpstreamUrl, proxyRequest } from './_proxy';

describe('same-origin API proxy', () => {
  it('builds the upstream URL only from the fixed server origin and request path', () => {
    const requestUrl = new URL('https://app.example/api/observacoes?workspaceId=alpha&target=https://evil.test');

    expect(buildUpstreamUrl(requestUrl, 'https://api.example')).toBe(
      'https://api.example/api/observacoes?workspaceId=alpha&target=https://evil.test'
    );
  });

  it.each([
    ['javascript:alert(1)'],
    ['ftp://api.example'],
    ['http://api.example'],
    ['https://user:secret@api.example'],
    ['https://api.example/base'],
    ['https://api.example?tenant=other'],
    ['https://api.example/#fragment']
  ])('rejects an unsafe ANGICO_API_ORIGIN value: %s', (origin) => {
    expect(() => buildUpstreamUrl(new URL('https://app.example/api/me'), origin)).toThrow(
      'ANGICO_API_ORIGIN'
    );
  });

  it('confines requests to the /api namespace', () => {
    expect(() => buildUpstreamUrl(
      new URL('https://app.example/internal/config'),
      'https://api.example'
    )).toThrow('/api');
  });

  it('forwards cookies, CSRF and the exact body while removing hop-by-hop request headers', async () => {
    const upstreamFetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('cookie')).toBe('ANGICO_SESSION=opaque');
      expect(headers.get('x-csrf-token')).toBe('csrf-token');
      expect(headers.get('connection')).toBeNull();
      expect(headers.get('host')).toBeNull();
      expect(headers.get('forwarded')).toBeNull();
      expect(headers.get('x-forwarded-host')).toBeNull();
      expect(headers.get('accept-encoding')).toBe('identity');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBeInstanceOf(ArrayBuffer);
      expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe('{"nome":"Ipê"}');
      return new Response('{}', { status: 201, headers: { 'content-type': 'application/json' } });
    });
    const request = new Request('https://app.example/api/observacoes', {
      method: 'POST',
      headers: {
        cookie: 'ANGICO_SESSION=opaque',
        'x-csrf-token': 'csrf-token',
        connection: 'keep-alive',
        host: 'attacker.example',
        forwarded: 'host=attacker.example',
        'x-forwarded-host': 'attacker.example',
        'content-type': 'application/json'
      },
      body: '{"nome":"Ipê"}'
    });

    const response = await proxyRequest(request, 'https://api.example', upstreamFetch);

    expect(upstreamFetch).toHaveBeenCalledOnce();
    expect(upstreamFetch.mock.calls[0]?.[0].toString()).toBe('https://api.example/api/observacoes');
    expect(response.status).toBe(201);
  });

  it('preserves status, body, cookies and application headers while filtering hop-by-hop response headers', async () => {
    const upstreamHeaders = new Headers({
      'content-type': 'application/json',
      connection: 'close',
      'content-encoding': 'gzip',
      'x-request-id': 'request-123'
    });
    upstreamHeaders.append('set-cookie', 'ANGICO_SESSION=session; Path=/; HttpOnly; SameSite=Lax');
    upstreamHeaders.append('set-cookie', 'PREFERENCE=compact; Path=/; SameSite=Lax');
    const upstreamFetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', {
      status: 202,
      headers: upstreamHeaders
    }));

    const response = await proxyRequest(
      new Request('https://app.example/api/auth/login'),
      'https://api.example',
      upstreamFetch
    );

    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe('{"ok":true}');
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('x-request-id')).toBe('request-123');
    expect(response.headers.get('connection')).toBeNull();
    expect(response.headers.get('content-encoding')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('set-cookie')).toContain('ANGICO_SESSION=session');
    expect(response.headers.get('set-cookie')).toContain('PREFERENCE=compact');
  });

  it('does not send a body on GET or HEAD requests', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await proxyRequest(new Request('https://app.example/api/workspaces'), 'http://localhost:8082', upstreamFetch);

    expect(upstreamFetch).toHaveBeenCalledWith(
      'http://localhost:8082/api/workspaces',
      expect.objectContaining({ method: 'GET', body: undefined })
    );
  });
});
