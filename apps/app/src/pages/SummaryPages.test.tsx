import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RelatoriosPage } from './SummaryPages';
import { loadDashboard } from '../lib/api';
import type { DashboardData } from '../types';

vi.mock('../lib/api', () => ({ loadDashboard: vi.fn() }));

const dashboard: DashboardData = {
  workspaceId: 'workspace-a',
  territory: { id: 'workspace-a', name: 'Vila da Serra', subtitle: 'Recife, PE' },
  stats: [],
  activities: [],
  missions: [{ title: 'Cuidar da nascente', progress: 40, actions: '2 ações', status: 'EM ANDAMENTO' }],
  impact: [],
  categoryDistribution: [],
  memoryClaim: 'Memória atual'
};

describe('RelatoriosPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the mission status from the renamed dashboard contract', async () => {
    vi.mocked(loadDashboard).mockResolvedValue(dashboard);
    render(
      <MemoryRouter initialEntries={['/relatorios']}>
        <Routes>
          <Route element={<Outlet context={{ workspaceId: 'workspace-a' }} />}>
            <Route path="/relatorios" element={<RelatoriosPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('40% · 2 ações · EM ANDAMENTO')).toBeInTheDocument();
  });

  it('does not render a late dashboard response from the previous workspace', async () => {
    let resolveFirst!: (data: DashboardData) => void;
    let resolveSecond!: (data: DashboardData) => void;
    const first = new Promise<DashboardData>((resolve) => { resolveFirst = resolve; });
    const second = new Promise<DashboardData>((resolve) => { resolveSecond = resolve; });
    vi.mocked(loadDashboard).mockImplementation((workspaceId) => workspaceId === 'workspace-a' ? first : second);

    function Page({ workspaceId }: { workspaceId: string }) {
      return <MemoryRouter><Routes><Route element={<Outlet context={{ workspaceId }} />}><Route index element={<RelatoriosPage />} /></Route></Routes></MemoryRouter>;
    }

    const view = render(<Page workspaceId="workspace-a" />);
    view.rerender(<Page workspaceId="workspace-b" />);
    await act(async () => resolveSecond({ ...dashboard, workspaceId: 'workspace-b', territory: { ...dashboard.territory, name: 'Território B' } }));
    expect(await screen.findByRole('heading', { name: 'Território B' })).toBeInTheDocument();

    await act(async () => resolveFirst({ ...dashboard, territory: { ...dashboard.territory, name: 'Território antigo' } }));
    expect(screen.queryByRole('heading', { name: 'Território antigo' })).not.toBeInTheDocument();
  });
});
