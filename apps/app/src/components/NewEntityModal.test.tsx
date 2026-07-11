import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewEntityModal from './NewEntityModal';
import { captureObservation } from '../lib/offlineSync';
import { createProblema, listEntities, listTerritorios } from '../lib/api';

vi.mock('../lib/offlineSync', () => ({
  captureObservation: vi.fn()
}));

vi.mock('../lib/api', () => ({
  createEntity: vi.fn(),
  createProblema: vi.fn(),
  getSession: vi.fn().mockReturnValue({ pessoaId: 7, nome: 'Ana', angicoId: 'ana.sp' }),
  listEntities: vi.fn(),
  listTerritorios: vi.fn(),
  resolveCoords: vi.fn(),
  reverseGeocode: vi.fn(),
  searchGeocoding: vi.fn().mockResolvedValue([])
}));

const territory = {
  id: 4, workspaceId: 'territorio-teste', nome: 'Nascente Sul', tipo: 'MICROBACIA',
  cidade: null, bairro: null, estado: null, pais: null, latitude: null, longitude: null,
  boundingBox: [], status: 'ATIVO', updatedAt: null
};
const origin = {
  id: 6, workspaceId: 'territorio-teste', territorioId: '4', categoria: 'Água e Saneamento',
  titulo: 'Água turva observada', status: 'ABERTA', createdAt: '2026-07-10T10:00:00Z'
};

beforeEach(() => {
  vi.mocked(listTerritorios).mockResolvedValue([territory]);
  vi.mocked(listEntities).mockResolvedValue([origin]);
  vi.mocked(createProblema).mockResolvedValue({
    id: 11, workspaceId: 'territorio-teste', territorioId: '4', categoria: 'Água e Saneamento',
    titulo: 'Água turva', descricao: null, localizacao: null, latitude: null, longitude: null,
    severidade: 'ALTA', status: 'ABERTO', origemObservacaoId: '6', createdAt: '2026-07-10T11:00:00Z'
  });
});

afterEach(cleanup);

describe('field observation capture', () => {
  it('moves through the three explicit field steps without exposing database ids', async () => {
    render(
      <NewEntityModal
        workspaceId="territorio-teste"
        initialType="observacao"
        lockType
        onClose={() => undefined}
        onCreated={() => undefined}
      />
    );

    expect(screen.getByText('Registrar')).toBeInTheDocument();
    expect(screen.getByText('Ancorar')).toBeInTheDocument();
    expect(screen.getByText('Comprovar e salvar')).toBeInTheDocument();
    expect(screen.queryByLabelText(/id/i)).not.toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText('Território relacionado'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Nascente com resíduos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para ancorar' }));

    expect(screen.getByRole('heading', { name: 'Onde aconteceu?' })).toBeInTheDocument();
  });

  it('keeps a queued observation visible until the person acknowledges its sync state', async () => {
    vi.mocked(captureObservation).mockResolvedValue({
      clientMutationId: 'local-1',
      status: 'QUEUED'
    });
    const onCreated = vi.fn();
    render(
      <NewEntityModal
        workspaceId="territorio-teste"
        initialType="observacao"
        lockType
        onClose={() => undefined}
        onCreated={onCreated}
      />
    );

    fireEvent.change(await screen.findByLabelText('Território relacionado'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Nascente com resíduos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para ancorar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para comprovar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Salva neste aparelho');
    expect(onCreated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));

    expect(captureObservation).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'territorio-teste',
      territorioId: '4',
      titulo: 'Nascente com resíduos'
    }));
    expect(vi.mocked(captureObservation).mock.calls[0]?.[0]).not.toHaveProperty('autorId');
  });

  it('creates a problem from a named territory and optional source observation', async () => {
    const onCreated = vi.fn();
    render(
      <NewEntityModal
        workspaceId="territorio-teste"
        initialType="problema"
        lockType
        onClose={() => undefined}
        onCreated={onCreated}
      />
    );

    fireEvent.change(await screen.findByLabelText('Território relacionado'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/Observação de origem/), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Água turva' } });
    fireEvent.change(screen.getByLabelText('Severidade'), { target: { value: 'ALTA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para ancorar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para comprovar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar problema' }));

    await waitFor(() => expect(createProblema).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'territorio-teste',
      territorioId: '4',
      origemObservacaoId: '6',
      titulo: 'Água turva',
      severidade: 'ALTA'
    })));
    expect(vi.mocked(createProblema).mock.calls[0]?.[0]).not.toHaveProperty('autorId');
  });
});
