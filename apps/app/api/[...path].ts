import { proxyRequest } from './_proxy';

export default {
  async fetch(request: Request): Promise<Response> {
    const apiOrigin = process.env.ANGICO_API_ORIGIN;
    if (!apiOrigin) {
      return Response.json(
        { detail: 'API proxy is not configured' },
        { status: 500 }
      );
    }

    try {
      return await proxyRequest(request, apiOrigin);
    } catch (error) {
      const configurationError = error instanceof Error
        && error.message.includes('ANGICO_API_ORIGIN');
      return Response.json(
        { detail: configurationError ? 'API proxy is misconfigured' : 'API upstream is unavailable' },
        { status: configurationError ? 500 : 502 }
      );
    }
  }
};
