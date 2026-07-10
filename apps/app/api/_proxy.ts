const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};

function parseApiOrigin(rawOrigin: string): URL {
  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    throw new Error('ANGICO_API_ORIGIN must be an absolute HTTP(S) origin');
  }

  const loopback = new Set(['localhost', '127.0.0.1', '::1', '[::1]']).has(origin.hostname);
  const safeProtocol = origin.protocol === 'https:'
    || (origin.protocol === 'http:' && loopback);
  const hasUnsafeParts = !safeProtocol
    || Boolean(origin.username)
    || Boolean(origin.password)
    || (origin.pathname !== '/' && origin.pathname !== '')
    || Boolean(origin.search)
    || Boolean(origin.hash);
  if (hasUnsafeParts) {
    throw new Error('ANGICO_API_ORIGIN must contain only an HTTP(S) origin');
  }
  return origin;
}

export function buildUpstreamUrl(requestUrl: URL, rawOrigin: string): string {
  if (requestUrl.pathname !== '/api' && !requestUrl.pathname.startsWith('/api/')) {
    throw new Error('Proxy requests must stay within /api');
  }
  const origin = parseApiOrigin(rawOrigin);
  return new URL(`${requestUrl.pathname}${requestUrl.search}`, origin).toString();
}

function connectionScopedHeaders(headers: Headers): Set<string> {
  const scoped = new Set(HOP_BY_HOP_HEADERS);
  for (const token of (headers.get('connection') ?? '').split(',')) {
    const normalized = token.trim().toLowerCase();
    if (normalized) scoped.add(normalized);
  }
  return scoped;
}

function requestHeaders(headers: Headers): Headers {
  const blocked = connectionScopedHeaders(headers);
  blocked.add('host');
  blocked.add('content-length');
  blocked.add('forwarded');
  const result = new Headers();
  headers.forEach((value, name) => {
    const normalized = name.toLowerCase();
    if (!blocked.has(normalized) && !normalized.startsWith('x-forwarded-')) {
      result.append(name, value);
    }
  });
  result.set('accept-encoding', 'identity');
  return result;
}

function responseHeaders(headers: Headers): Headers {
  const blocked = connectionScopedHeaders(headers);
  blocked.add('content-length');
  blocked.add('content-encoding');
  const result = new Headers();
  headers.forEach((value, name) => {
    const normalized = name.toLowerCase();
    if (!blocked.has(normalized) && normalized !== 'set-cookie') {
      result.append(name, value);
    }
  });

  const headersWithSetCookie = headers as HeadersWithSetCookie;
  const cookies = headersWithSetCookie.getSetCookie?.()
    ?? (headers.get('set-cookie') ? [headers.get('set-cookie') as string] : []);
  for (const cookie of cookies) result.append('set-cookie', cookie);
  result.set('cache-control', 'no-store');
  return result;
}

export async function proxyRequest(
  request: Request,
  rawOrigin: string,
  upstreamFetch: FetchImplementation = fetch
): Promise<Response> {
  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD'
    ? undefined
    : await request.arrayBuffer();
  const upstream = await upstreamFetch(buildUpstreamUrl(new URL(request.url), rawOrigin), {
    method,
    headers: requestHeaders(request.headers),
    body,
    redirect: 'manual',
    signal: request.signal
  });

  const responseHasNoBody = method === 'HEAD'
    || upstream.status === 204
    || upstream.status === 205
    || upstream.status === 304;

  return new Response(responseHasNoBody ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders(upstream.headers)
  });
}
