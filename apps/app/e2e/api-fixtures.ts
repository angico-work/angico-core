import type { Page } from '@playwright/test';

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

export async function installApiFixtures(page: Page): Promise<string[]> {
  const unhandledRequests: string[] = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;

    if (key === 'POST /api/auth/login' || key === 'GET /api/auth/me') {
      await route.fulfill({ status: 200, json: session });
      return;
    }
    if (key === 'GET /api/workspaces') {
      await route.fulfill({ status: 200, json: responses.workspaces });
      return;
    }
    if (key === 'GET /api/pessoas') {
      await route.fulfill({ status: 200, json: responses.people });
      return;
    }
    if (key === 'GET /api/glimpse/dashboard') {
      await route.fulfill({ status: 200, json: responses.dashboard });
      return;
    }
    if (key === 'GET /api/glimpse/map' || key.startsWith('GET /api/history/workspaces/')) {
      await route.fulfill({ status: 200, json: [] });
      return;
    }

    unhandledRequests.push(`${key}${url.search}`);
    await route.fulfill({ status: 501, json: { message: 'Fixture ausente.' } });
  });
  return unhandledRequests;
}
