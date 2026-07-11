import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    await waitFor(() => expect(loadMemoria).toHaveBeenCalledWith('territorio-a', {}));

    view.rerender(page('territorio-b'));
    await waitFor(() => expect(loadMemoria).toHaveBeenCalledWith('territorio-b', {}));
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

  it('applies provenance filters and links a supported event to its trace', async () => {
    vi.mocked(loadMemoria).mockResolvedValue([{
      workspaceId: 'territorio-a', sequence: 2, entityType: 'ACAO', entityId: '42/campo',
      eventType: 'acao.iniciada', actorId: 'ana.sp', source: 'offline', syncStatus: 'SYNCED_FROM_OFFLINE',
      occurredAt: '2026-07-10T12:02:00Z'
    }]);
    render(page('territorio-a'));
    expect(await screen.findByRole('link', { name: 'Abrir Ação no Rastro' })).toHaveAttribute(
      'href', '/app/rastro/ACAO/42%2Fcampo'
    );

    fireEvent.change(screen.getByLabelText('Evento'), { target: { value: 'acao.iniciada' } });
    fireEvent.change(screen.getByLabelText('Autoria'), { target: { value: '@ana.sp' } });
    fireEvent.change(screen.getByLabelText('Origem'), { target: { value: 'offline' } });
    fireEvent.change(screen.getByLabelText('Sincronização'), { target: { value: 'SYNCED_FROM_OFFLINE' } });
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-07-01' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-07-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => expect(loadMemoria).toHaveBeenLastCalledWith('territorio-a', expect.objectContaining({
      eventType: 'acao.iniciada',
      actorId: 'ana.sp',
      source: 'offline',
      syncStatus: 'SYNCED_FROM_OFFLINE',
      from: expect.stringContaining('2026-07-01'),
      to: expect.stringContaining('2026-08-01')
    })));
  });
});
