import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';

let dashboardModuleLoads = 0;

vi.doMock('./components/AppShell', () => ({
  default: function TestShell() {
    return <main data-testid="app-shell"><Outlet /></main>;
  }
}));

vi.doMock('./pages/DashboardPage', async () => {
  dashboardModuleLoads += 1;
  await new Promise((resolve) => setTimeout(resolve, 25));
  return {
    default: function TestDashboard() {
      return <h1>Painel carregado</h1>;
    }
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('loads the dashboard route without replacing the application shell', async () => {
  const { default: App } = await import('./App');

  expect(dashboardModuleLoads).toBe(0);

  render(
    <MemoryRouter initialEntries={['/app']}>
      <App />
    </MemoryRouter>
  );

  expect(screen.getByTestId('app-shell')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Abrindo painel…');
  expect(await screen.findByRole('heading', { name: 'Painel carregado' })).toBeInTheDocument();
  expect(dashboardModuleLoads).toBe(1);
});
