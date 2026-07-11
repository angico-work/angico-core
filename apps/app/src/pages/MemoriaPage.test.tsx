import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MemoriaPage from './MemoriaPage';
import { loadMemoria } from '../lib/api';

vi.mock('../lib/api', () => ({ loadMemoria: vi.fn() }));

function page(workspaceId: string) {
  return (
    <MemoryRouter initialEntries={['/memoria']}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId }} />}>
          <Route path="/memoria" element={<MemoriaPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('MemoriaPage workspace boundary', () => {
  beforeEach(() => vi.mocked(loadMemoria).mockResolvedValue([]));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('ignores an older memory response after the active workspace changes', async () => {
    const first = deferred<Awaited<ReturnType<typeof loadMemoria>>>();
    const second = deferred<Awaited<ReturnType<typeof loadMemoria>>>();
    vi.mocked(loadMemoria).mockImplementation((workspaceId) => (
      workspaceId === 'territorio-a' ? first.promise : second.promise
    ));
    const view = render(page('territorio-a'));
    await waitFor(() => expect(loadMemoria).toHaveBeenCalledWith('territorio-a'));

    view.rerender(page('territorio-b'));
    await waitFor(() => expect(loadMemoria).toHaveBeenCalledWith('territorio-b'));
    await act(async () => {
      second.resolve([{
        workspaceId: 'territorio-b', sequence: 2, entityType: 'ACAO', entityId: '2',
        eventType: 'acao.iniciada', actorId: 'bia.sp', occurredAt: '2026-07-10T12:02:00Z'
      }]);
      await second.promise;
    });
    expect(await screen.findByText('Ação iniciada')).toBeInTheDocument();
    expect(screen.getByText('bia.sp')).toBeInTheDocument();

    await act(async () => {
      first.resolve([{
        workspaceId: 'territorio-a', sequence: 1, entityType: 'OBSERVACAO', entityId: '1',
        eventType: 'observacao.registrada', actorId: 'ana.sp', occurredAt: '2026-07-10T12:01:00Z'
      }]);
      await first.promise;
    });

    expect(screen.queryByText('Observação registrada')).not.toBeInTheDocument();
    expect(screen.getByText('Ação iniciada')).toBeInTheDocument();
  });
});
