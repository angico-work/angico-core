import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RelationalEntityDialog from './RelationalEntityDialog';
import { captureDomainMutation } from '../lib/offlineSync';
import {
  listMissoes,
  listProblemas,
  listTerritorios,
  searchPessoas
} from '../lib/api';

vi.mock('../lib/offlineSync', () => ({ captureDomainMutation: vi.fn() }));

vi.mock('../lib/api', () => ({
  listMissoes: vi.fn(),
  listProblemas: vi.fn(),
  listTerritorios: vi.fn(),
  searchPessoas: vi.fn()
}));

const territory = {
  id: 4, workspaceId: 'workspace-a', nome: 'Nascente Sul', tipo: 'MICROBACIA',
  cidade: null, bairro: null, estado: null, pais: null, latitude: null, longitude: null,
  boundingBox: [], status: 'ATIVO', updatedAt: null
};
const problem = {
  id: 11, workspaceId: 'workspace-a', territorioId: '4', categoria: 'Água e Saneamento',
  titulo: 'Água turva', descricao: null, localizacao: null, latitude: null, longitude: null,
  severidade: 'ALTA', status: 'ABERTO', origemObservacaoId: '6', createdAt: '2026-07-10T10:00:00Z'
};
const mission = {
  id: 20, workspaceId: 'workspace-a', territorioId: '4', problemaId: '11', responsavelId: '7',
  titulo: 'Recuperar a nascente', descricao: null, status: 'PLANEJADA', progresso: 0,
  createdAt: '2026-07-10T11:00:00Z'
};
const person = {
  id: 7, workspaceId: 'workspace-a', nome: 'Ana Souza', papel: 'Coordenação', angicoId: 'ana.sp',
  telefone: null, foto: null, createdAt: '2026-07-10T09:00:00Z'
};

describe('RelationalEntityDialog', () => {
  beforeEach(() => {
    vi.mocked(listTerritorios).mockResolvedValue([territory]);
    vi.mocked(listProblemas).mockResolvedValue([problem]);
    vi.mocked(listMissoes).mockResolvedValue([mission]);
    vi.mocked(searchPessoas).mockResolvedValue([person]);
    vi.mocked(captureDomainMutation).mockResolvedValue({
      clientMutationId: 'relational-1', status: 'SYNCED', remote: {
        operation: 'MISSAO_CREATE', workspaceId: 'workspace-a',
        clientMutationId: 'relational-1', resourceId: '20'
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  async function pickPerson() {
    const input = screen.getByLabelText('Pessoa responsável');
    fireEvent.change(input, { target: { value: 'Ana' } });
    await screen.findByRole('option', { name: /Ana Souza/ });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
  }

  it('creates a mission from named territory, problem and person selections', async () => {
    render(<RelationalEntityDialog type="missao" workspaceId="workspace-a" onClose={vi.fn()} onCreated={vi.fn()} />);

    await screen.findByRole('option', { name: 'Nascente Sul' });
    fireEvent.change(screen.getByLabelText('Território'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Problema de origem'), { target: { value: '11' } });
    await pickPerson();
    fireEvent.change(screen.getByLabelText('Objetivo da missão'), { target: { value: 'Recuperar a nascente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar missão' }));

    await waitFor(() => expect(captureDomainMutation).toHaveBeenCalledWith(
      'MISSAO_CREATE',
      {
        workspaceId: 'workspace-a',
        territorioId: '4',
        problemaId: '11',
        responsavelId: '7',
        titulo: 'Recuperar a nascente',
        descricao: undefined
      }
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('Sincronização concluída');
    expect(screen.queryByLabelText(/\bid\b/i)).not.toBeInTheDocument();
    expect(vi.mocked(captureDomainMutation).mock.calls[0]?.[1]).not.toHaveProperty('actorId');
    expect(vi.mocked(captureDomainMutation).mock.calls[0]?.[1]).not.toHaveProperty('autorId');
  });

  it('honors a mission deep link while keeping the technical id out of the form', async () => {
    vi.mocked(captureDomainMutation).mockResolvedValue({
      clientMutationId: 'action-local-1', status: 'QUEUED'
    });
    const onCreated = vi.fn();
    render(
      <RelationalEntityDialog
        type="acao"
        workspaceId="workspace-a"
        initialMissaoId="20"
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    );

    await waitFor(() => expect(screen.getByLabelText('Missão')).toHaveValue('20'));
    await pickPerson();
    fireEvent.change(screen.getByLabelText('Ação realizada'), { target: { value: 'Limpar margem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar ação' }));

    await waitFor(() => expect(captureDomainMutation).toHaveBeenCalledWith(
      'ACAO_CREATE',
      {
        workspaceId: 'workspace-a',
        missaoId: '20',
        responsavelId: '7',
        titulo: 'Limpar margem',
        descricao: undefined
      }
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('Salvo neste aparelho');
    expect(onCreated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it('drops stale mission options when the workspace changes', async () => {
    vi.mocked(listMissoes).mockImplementation(async (workspaceId) => workspaceId === 'workspace-a'
      ? [mission]
      : [{ ...mission, id: 90, workspaceId: 'workspace-b', titulo: 'Missão do outro espaço' }]);
    const view = render(
      <RelationalEntityDialog type="acao" workspaceId="workspace-a" onClose={vi.fn()} onCreated={vi.fn()} />
    );
    expect(await screen.findByRole('option', { name: 'Recuperar a nascente' })).toBeInTheDocument();

    view.rerender(
      <RelationalEntityDialog type="acao" workspaceId="workspace-b" onClose={vi.fn()} onCreated={vi.fn()} />
    );

    expect(await screen.findByRole('option', { name: 'Missão do outro espaço' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Recuperar a nascente' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Pessoa responsável')).toHaveValue('');
  });

  it('does not show an old submission result after the workspace changes', async () => {
    let resolveCapture!: (value: { clientMutationId: string; status: 'QUEUED' }) => void;
    vi.mocked(captureDomainMutation).mockReturnValue(new Promise((resolve) => {
      resolveCapture = resolve;
    }));
    const view = render(
      <RelationalEntityDialog type="acao" workspaceId="workspace-a" onClose={vi.fn()} onCreated={vi.fn()} />
    );
    await screen.findByRole('option', { name: 'Recuperar a nascente' });
    fireEvent.change(screen.getByLabelText('Missão'), { target: { value: '20' } });
    await pickPerson();
    fireEvent.change(screen.getByLabelText('Ação realizada'), { target: { value: 'Limpar margem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar ação' }));
    await waitFor(() => expect(captureDomainMutation).toHaveBeenCalledOnce());

    view.rerender(
      <RelationalEntityDialog type="acao" workspaceId="workspace-b" onClose={vi.fn()} onCreated={vi.fn()} />
    );
    resolveCapture({ clientMutationId: 'old-action', status: 'QUEUED' });

    await waitFor(() => expect(screen.queryByText('Salvo neste aparelho')).not.toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: 'Nova ação' })).toBeInTheDocument();
  });
});
