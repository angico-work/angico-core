import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MapPage from './MapPage';
import { loadMapPoints } from '../lib/api';

vi.mock('../lib/api', () => ({
  loadMapPoints: vi.fn(),
  resolveCoords: vi.fn(),
  searchGeocoding: vi.fn().mockResolvedValue([]),
  listTerritorios: vi.fn().mockResolvedValue([]),
  listEntities: vi.fn().mockResolvedValue([]),
  reverseGeocode: vi.fn(),
  createEntity: vi.fn(),
  createProblema: vi.fn(),
  getSession: vi.fn()
}));

vi.mock('../components/MapView', () => ({
  default: ({ center }: { center: [number, number] }) => <div data-testid="map-view" data-center={center.join(',')} />
}));

function mapView(workspaceId = 'workspace-a') {
  return (
    <MemoryRouter initialEntries={['/mapa']}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId }} />}>
          <Route path="/mapa" element={<MapPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function renderPage(workspaceId?: string) {
  return render(mapView(workspaceId));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('MapPage real location boundaries', () => {
  beforeEach(() => vi.mocked(loadMapPoints).mockResolvedValue([]));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows an empty state instead of centering the map on an invented place', async () => {
    renderPage();

    expect(await screen.findByText('Nenhuma localização real disponível')).toBeInTheDocument();
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument();
  });

  it('anchors the map to confirmed points when they exist', async () => {
    vi.mocked(loadMapPoints).mockResolvedValue([{
      workspaceId: 'workspace-a',
      type: 'observacao', id: 6, titulo: 'Água turva', categoria: 'Água', status: 'ABERTA',
      latitude: -8.0522, longitude: -34.9286
    }]);
    renderPage();

    expect(await screen.findByTestId('map-view')).toHaveAttribute('data-center', '-8.0522,-34.9286');
  });

  it('ignores an older map response after the active workspace changes', async () => {
    const first = deferred<Awaited<ReturnType<typeof loadMapPoints>>>();
    const second = deferred<Awaited<ReturnType<typeof loadMapPoints>>>();
    vi.mocked(loadMapPoints).mockImplementation((workspaceId) => (
      workspaceId === 'territorio-a' ? first.promise : second.promise
    ));
    const view = renderPage('territorio-a');
    await waitFor(() => expect(loadMapPoints).toHaveBeenCalledWith('territorio-a'));

    view.rerender(mapView('territorio-b'));
    await waitFor(() => expect(loadMapPoints).toHaveBeenCalledWith('territorio-b'));
    await act(async () => {
      second.resolve([{
        workspaceId: 'territorio-b', type: 'problema', id: 8, titulo: 'Ponto B',
        categoria: 'Água', status: 'ABERTO', latitude: -9, longitude: -35
      }]);
      await second.promise;
    });
    expect(await screen.findByTestId('map-view')).toHaveAttribute('data-center', '-9,-35');

    await act(async () => {
      first.resolve([{
        workspaceId: 'territorio-a', type: 'observacao', id: 7, titulo: 'Ponto A',
        categoria: 'Água', status: 'ABERTA', latitude: -8, longitude: -34
      }]);
      await first.promise;
    });

    expect(screen.getByTestId('map-view')).toHaveAttribute('data-center', '-9,-35');
  });
});
