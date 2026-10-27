import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewEntityModal from './NewEntityModal';
import { captureDomainMutation, captureObservation } from '../lib/offlineSync';
import { createTerritorio, listEntities, listTerritorios, resolveCoords, searchGeocoding } from '../lib/api';

vi.mock('../lib/offlineSync', () => ({
  captureDomainMutation: vi.fn(),
  captureObservation: vi.fn()
}));

vi.mock('../lib/api', () => ({
  getSession: vi.fn().mockReturnValue({ pessoaId: 7, nome: 'Ana', angicoId: 'ana.sp' }),
  listEntities: vi.fn(),
  listTerritorios: vi.fn(),
  createTerritorio: vi.fn(),
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
  vi.clearAllMocks();
  vi.mocked(captureObservation).mockReset();
  vi.mocked(createTerritorio).mockReset();
  vi.mocked(resolveCoords).mockReset();
  vi.mocked(searchGeocoding).mockReset().mockResolvedValue([]);
  vi.mocked(listTerritorios).mockResolvedValue([territory]);
  vi.mocked(listEntities).mockResolvedValue([origin]);
  vi.mocked(captureDomainMutation).mockResolvedValue({
    clientMutationId: 'domain-1', status: 'SYNCED', remote: {
      operation: 'PROBLEMA_CREATE', workspaceId: 'territorio-teste',
      clientMutationId: 'domain-1', resourceId: '11'
    }
  });
});

afterEach(cleanup);

describe('field observation capture', () => {
  it('only applies an AI category after review, preserves urgency and invalidates stale suggestions', async () => {
    render(<NewEntityModal workspaceId="territorio-teste" onClose={() => undefined} onCreated={() => undefined} />);
    const title = screen.getByLabelText('Título');
    fireEvent.change(title, { target: { value: 'Esgoto vazando e água contaminada' } });
    fireEvent.change(screen.getByLabelText('Urgência'), { target: { value: 'BAIXA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categoria com IA' }));
    expect(await screen.findByRole('button', { name: 'Usar Água e Saneamento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Categoria')).toHaveValue('Resíduos');
    fireEvent.click(screen.getByRole('button', { name: 'Usar Água e Saneamento' }));
    expect(screen.getByLabelText('Categoria')).toHaveValue('Água e Saneamento');
    expect(screen.getByLabelText('Urgência')).toHaveValue('BAIXA');
    expect(captureObservation).not.toHaveBeenCalled();
    fireEvent.change(title, { target: { value: 'Calçada quebrada atrapalha pedestres' } });
    expect(screen.queryByRole('button', { name: 'Usar Água e Saneamento' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Categoria')).toHaveValue('Água e Saneamento');
    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categoria com IA' }));
    expect(screen.getByRole('button', { name: 'Usar Mobilidade' })).toBeInTheDocument();
  });

  const place = {
    displayName: 'Mococa, São Paulo, Brasil', city: 'Mococa', state: 'São Paulo',
    neighborhood: null, country: 'Brasil', latitude: -21.467, longitude: -47.004, boundingBox: []
  };

  async function choosePlace() {
    fireEvent.change(await screen.findByLabelText('Buscar cidade, local ou endereço'), { target: { value: 'Mococa' } });
    fireEvent.mouseDown(await screen.findByRole('option', { name: /Mococa/ }));
    await waitFor(() => expect(screen.getByText(/será adicionado aos territórios ao salvar/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Praça com resíduos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para ancorar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para comprovar' }));
  }

  it('captures a searched city in an empty workspace without a separate territory form', async () => {
    vi.mocked(listTerritorios).mockResolvedValue([]);
    vi.mocked(searchGeocoding).mockResolvedValue([place]);
    vi.mocked(resolveCoords).mockResolvedValue([-21.467, -47.004]);
    vi.mocked(createTerritorio).mockResolvedValue({ ...territory, id: 9, nome: place.displayName });
    vi.mocked(captureObservation).mockResolvedValue({ clientMutationId: 'place-1', status: 'SYNCED' });
    render(<NewEntityModal workspaceId="territorio-teste" onClose={() => undefined} onCreated={() => undefined} />);

    await choosePlace();
    expect(createTerritorio).not.toHaveBeenCalled();
    expect(screen.getAllByText(place.displayName).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Registro sincronizado');
    expect(createTerritorio).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'territorio-teste', nome: place.displayName, cidade: 'Mococa', latitude: -21.467, longitude: -47.004
    }));
    expect(captureObservation).toHaveBeenCalledWith(expect.objectContaining({
      territorioId: '9', localizacao: place.displayName, latitude: -21.467, longitude: -47.004
    }));
  });

  it('retains the created territory when retrying a failed observation save', async () => {
    vi.mocked(listTerritorios).mockResolvedValue([]);
    vi.mocked(searchGeocoding).mockResolvedValue([place]);
    vi.mocked(resolveCoords).mockResolvedValue([-21.467, -47.004]);
    vi.mocked(createTerritorio).mockResolvedValue({ ...territory, id: 9, nome: place.displayName });
    vi.mocked(captureObservation).mockRejectedValueOnce(new Error('Não foi possível salvar')).mockResolvedValue({ clientMutationId: 'place-2', status: 'SYNCED' });
    render(<NewEntityModal workspaceId="territorio-teste" onClose={() => undefined} onCreated={() => undefined} />);
    await choosePlace();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Registro sincronizado');
    expect(createTerritorio).toHaveBeenCalledTimes(1);
  });

  it('invalidates a selected place when its text changes', async () => {
    vi.mocked(listTerritorios).mockResolvedValue([]);
    vi.mocked(searchGeocoding).mockResolvedValue([place]);
    vi.mocked(resolveCoords).mockResolvedValue([-21.467, -47.004]);
    render(<NewEntityModal workspaceId="territorio-teste" onClose={() => undefined} onCreated={() => undefined} />);
    await choosePlace();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    fireEvent.change(screen.getByLabelText('Endereço, comunidade ou referência'), { target: { value: 'Outro lugar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para comprovar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione uma cidade, local ou endereço');
    expect(createTerritorio).not.toHaveBeenCalled();
  });

  it('does not save the record if adding its searched location fails', async () => {
    vi.mocked(listTerritorios).mockResolvedValue([]);
    vi.mocked(searchGeocoding).mockResolvedValue([place]);
    vi.mocked(resolveCoords).mockResolvedValue([-21.467, -47.004]);
    vi.mocked(createTerritorio).mockRejectedValue(new Error('Sem conexão para adicionar o local'));
    render(<NewEntityModal workspaceId="territorio-teste" onClose={() => undefined} onCreated={() => undefined} />);
    await choosePlace();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão para adicionar o local');
    expect(captureObservation).not.toHaveBeenCalled();
  });

  it('shows a lookup failure instead of accepting a place without coordinates', async () => {
    vi.mocked(listTerritorios).mockResolvedValue([]);
    vi.mocked(searchGeocoding).mockResolvedValue([{ ...place, latitude: null, longitude: null }]);
    vi.mocked(resolveCoords).mockResolvedValue(null);
    render(<NewEntityModal workspaceId="territorio-teste" onClose={() => undefined} onCreated={() => undefined} />);
    fireEvent.change(await screen.findByLabelText('Buscar cidade, local ou endereço'), { target: { value: 'Mococa' } });
    fireEvent.mouseDown(await screen.findByRole('option', { name: /Mococa/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível localizar esse resultado no mapa');
    expect(createTerritorio).not.toHaveBeenCalled();
  });

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
    expect(screen.queryByLabelText(/\bid\b/i)).not.toBeInTheDocument();

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

    await waitFor(() => expect(captureDomainMutation).toHaveBeenCalledWith(
      'PROBLEMA_CREATE',
      expect.objectContaining({
      workspaceId: 'territorio-teste',
      territorioId: '4',
      origemObservacaoId: '6',
      titulo: 'Água turva',
      severidade: 'ALTA'
      })
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('Sincronização concluída');
    expect(vi.mocked(captureDomainMutation).mock.calls[0]?.[1]).not.toHaveProperty('autorId');
  });

  it('keeps a potentiality local while it is waiting for synchronization', async () => {
    vi.mocked(captureDomainMutation).mockResolvedValue({
      clientMutationId: 'potential-local-1', status: 'QUEUED'
    });
    render(
      <NewEntityModal
        workspaceId="territorio-teste"
        initialType="potencialidade"
        lockType
        onClose={() => undefined}
        onCreated={() => undefined}
      />
    );

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Horta comunitária' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para ancorar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para comprovar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar potencialidade' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Salvo neste aparelho');
    expect(captureDomainMutation).toHaveBeenCalledWith(
      'POTENCIALIDADE_CREATE',
      expect.objectContaining({ workspaceId: 'territorio-teste', titulo: 'Horta comunitária' })
    );
  });
});
