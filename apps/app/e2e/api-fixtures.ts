import type { Page, Request } from '@playwright/test';

const WORKSPACE_ID = 'territorio-verificacao';
const NOW = '2026-07-10T12:00:00Z';

const session = {
  pessoaId: 7,
  nome: 'Ana Ribeiro',
  email: 'ana@example.org',
  angicoId: 'ana.ribeiro',
  papel: 'OWNER',
  workspaceId: WORKSPACE_ID,
  expiresAt: '2099-01-01T00:00:00Z',
  csrfToken: 'csrf-e2e'
};

const responses = {
  workspaces: [{
    slug: WORKSPACE_ID,
    nome: 'Território de verificação',
    descricao: null,
    cidade: 'Recife',
    estado: 'PE',
    centerLatitude: null,
    centerLongitude: null,
    status: 'ACTIVE',
    createdBy: 'ana.ribeiro',
    createdAt: NOW,
    updatedAt: NOW
  }],
  people: [{
    id: 7,
    workspaceId: WORKSPACE_ID,
    nome: 'Ana Ribeiro',
    papel: 'OWNER',
    angicoId: 'ana.ribeiro',
    telefone: null,
    foto: null,
    createdAt: NOW
  }],
  dashboard: {
    workspaceId: WORKSPACE_ID,
    territory: {
      id: WORKSPACE_ID,
      name: 'Território de verificação',
      subtitle: 'Fixture local do smoke test'
    },
    stats: [],
    activities: [],
    missions: [],
    impact: [],
    categoryDistribution: [],
    memoryClaim: 'Nenhum dado operacional externo é usado neste teste.'
  }
};

function hasExactQuery(url: URL, expected: Record<string, string>): boolean {
  const entries = Object.entries(expected);
  return url.searchParams.size === entries.length
    && entries.every(([name, value]) => url.searchParams.get(name) === value);
}

function hasExactLoginBody(request: Request): boolean {
  try {
    const body = request.postDataJSON();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
    const values = body as Record<string, unknown>;
    return Object.keys(values).length === 2
      && values.email === 'ana@example.org'
      && values.password === 'senha-local';
  } catch {
    return false;
  }
}

export async function installApiFixtures(page: Page): Promise<string[]> {
  const violations: string[] = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;
    const reject = async (reason: string) => {
      violations.push(`${key}${url.search}: ${reason}`);
      await route.fulfill({ status: 422, json: { message: 'Requisição fora do contrato da fixture.' } });
    };

    if (key === 'POST /api/auth/login') {
      if (!hasExactQuery(url, {})) return reject('query inesperada');
      if (!hasExactLoginBody(request)) return reject('corpo inesperado');
      await route.fulfill({ status: 200, json: session });
      return;
    }
    if (key === 'GET /api/auth/me') {
      if (!hasExactQuery(url, {})) return reject('query inesperada');
      await route.fulfill({ status: 200, json: session });
      return;
    }
    if (key === 'GET /api/workspaces') {
      if (!hasExactQuery(url, {})) return reject('query inesperada');
      await route.fulfill({ status: 200, json: responses.workspaces });
      return;
    }
    if (key === 'GET /api/pessoas') {
      if (!hasExactQuery(url, { workspaceId: WORKSPACE_ID })) return reject('query inesperada');
      await route.fulfill({ status: 200, json: responses.people });
      return;
    }
    if (key === 'GET /api/pessoas/me') {
      if (!hasExactQuery(url, {})) return reject('query inesperada');
      await route.fulfill({ status: 200, json: responses.people[0] });
      return;
    }
    if (key === 'GET /api/glimpse/dashboard') {
      if (!hasExactQuery(url, { workspaceId: WORKSPACE_ID })) return reject('query inesperada');
      await route.fulfill({ status: 200, json: responses.dashboard });
      return;
    }
    if (key === 'GET /api/glimpse/map') {
      if (!hasExactQuery(url, { workspaceId: WORKSPACE_ID })) return reject('query inesperada');
      await route.fulfill({ status: 200, json: [] });
      return;
    }
    if (key === `GET /api/history/workspaces/${WORKSPACE_ID}`) {
      if (!hasExactQuery(url, {})) return reject('query inesperada');
      await route.fulfill({ status: 200, json: [] });
      return;
    }

    violations.push(`${key}${url.search}: fixture ausente`);
    await route.fulfill({ status: 501, json: { message: 'Fixture ausente.' } });
  });
  return violations;
}
