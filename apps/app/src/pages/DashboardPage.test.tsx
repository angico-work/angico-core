import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { loadDashboard, loadMapPoints, loadMemoria } from '../lib/api';
import type { DashboardData } from '../types';

vi.mock('../lib/api', () => ({
  loadDashboard: vi.fn(),
  loadMapPoints: vi.fn(),
  loadMemoria: vi.fn()
}));

const dashboard: DashboardData = {
  workspaceId: 'workspace-a',
  territory: { id: 'workspace-a', name: 'Território A', subtitle: 'Recife, PE' },
  stats: [], activities: [], missions: [], impact: [], categoryDistribution: [], memoryClaim: 'Memória atual'
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function Page({ workspaceId }: { workspaceId: string }) {
  return <MemoryRouter><Routes><Route element={<Outlet context={{ workspaceId, workspaceRole: 'OWNER', canWrite: true }} />}><Route index element={<DashboardPage />} /></Route></Routes></MemoryRouter>;
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(loadMapPoints).mockResolvedValue([]);
    vi.mocked(loadMemoria).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('ignores a late response from the previous workspace', async () => {
    const first = deferred<DashboardData>();
    const second = deferred<DashboardData>();
    vi.mocked(loadDashboard).mockImplementation((workspaceId) => workspaceId === 'workspace-a' ? first.promise : second.promise);
    const view = render(<Page workspaceId="workspace-a" />);

    view.rerender(<Page workspaceId="workspace-b" />);
    await act(async () => second.resolve({ ...dashboard, workspaceId: 'workspace-b', territory: { ...dashboard.territory, name: 'Território B' } }));
    expect(await screen.findByRole('heading', { name: 'Território B' })).toBeInTheDocument();

    await act(async () => first.resolve({ ...dashboard, territory: { ...dashboard.territory, name: 'Território antigo' } }));
    expect(screen.queryByRole('heading', { name: 'Território antigo' })).not.toBeInTheDocument();
  });

  it('reports a failed confirmed read instead of presenting an empty section', async () => {
    vi.mocked(loadDashboard).mockResolvedValue(dashboard);
    vi.mocked(loadMapPoints).mockRejectedValue(new Error('Mapa confirmado indisponível'));

    render(<Page workspaceId="workspace-a" />);

    expect(await screen.findByText('Mapa confirmado indisponível')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Território A' })).not.toBeInTheDocument();
  });
});
