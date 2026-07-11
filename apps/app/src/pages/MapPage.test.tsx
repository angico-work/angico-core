import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/mapa']}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId: 'workspace-a' }} />}>
          <Route path="/mapa" element={<MapPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
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
      type: 'observacao', id: 6, titulo: 'Água turva', categoria: 'Água', status: 'ABERTA',
      latitude: -8.0522, longitude: -34.9286
    }]);
    renderPage();

    expect(await screen.findByTestId('map-view')).toHaveAttribute('data-center', '-8.0522,-34.9286');
  });
});
