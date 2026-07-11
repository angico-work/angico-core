import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MensagensPage from './MensagensPage';
import {
  createConversa,
  listConversas,
  listEntities,
  listMensagens,
  listTerritorios,
  markConversaRead,
  searchMensagens
} from '../lib/api';
import {
  cacheRemoteMessages,
  clearMessageDraft,
  getMessageAttachmentFile,
  listLocalMessages,
  loadMessageDraft,
  saveMessageDraft
} from '../lib/offlineStore';
import { captureMessage } from '../lib/offlineSync';
import { startOnlinePolling } from '../lib/messagePolling';

vi.mock('../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api')>();
  return {
    ...original,
    attachmentUrl: vi.fn((id: number) => `/api/mensagens/anexos/${id}`),
    createConversa: vi.fn(),
    getSession: vi.fn(() => ({
      pessoaId: 7,
      nome: 'Ana',
      email: 'ana@example.test',
      angicoId: 'ana.sp',
      papel: 'MEMBER',
      workspaceId: 'territorio-a',
      expiresAt: '2099-01-01T00:00:00Z',
      csrfToken: 'csrf'
    })),
    listConversas: vi.fn(),
    listEntities: vi.fn(),
    listMensagens: vi.fn(),
    listTerritorios: vi.fn(),
    markConversaRead: vi.fn(),
    sessionOwnerId: vi.fn(() => 'stable-owner'),
    searchMensagens: vi.fn()
  };
});

vi.mock('../lib/offlineStore', () => ({
  cacheRemoteMessages: vi.fn(),
  clearMessageDraft: vi.fn(),
  getMessageAttachmentFile: vi.fn(),
  listLocalMessages: vi.fn(),
  loadMessageDraft: vi.fn(),
  saveMessageDraft: vi.fn()
}));

vi.mock('../lib/offlineSync', () => ({
  captureMessage: vi.fn(),
  retryPendingMessages: vi.fn()
}));

vi.mock('../lib/messagePolling', () => ({
  startOnlinePolling: vi.fn(() => vi.fn())
}));

const conversation = {
  id: 12,
  workspaceId: 'territorio-a',
  territorioId: 4,
  contextEntityType: 'TERRITORIO',
  contextEntityId: '4',
  titulo: 'Cuidado da nascente',
  createdByPessoaId: 7,
  status: 'ATIVA',
  createdAt: '2026-07-10T12:00:00Z',
  updatedAt: '2026-07-10T14:00:00Z',
  unreadCount: 2,
  mensagens: []
};

const remoteMessage = {
  id: 91,
  workspaceId: 'territorio-a',
  conversaId: 12,
  senderPessoaId: 8,
  senderNome: 'Bia',
  corpo: 'A nascente precisa de proteção.',
  latitude: null,
  longitude: null,
  localDescricao: null,
  linkedEntityType: null,
  linkedEntityId: null,
  clientMessageId: 'remote-91',
  deviceId: 'device-bia',
  status: 'ENVIADA',
  occurredAt: '2026-07-10T13:50:00Z',
  recordedAt: '2026-07-10T14:00:00Z',
  createdAt: '2026-07-10T14:00:00Z',
  anexos: [],
  relacoes: []
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function PageUnderTest({ workspaceId = 'territorio-a' }: { workspaceId?: string }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId }} />}>
          <Route index element={<MensagensPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function renderPage(workspaceId = 'territorio-a') {
  return render(<PageUnderTest workspaceId={workspaceId} />);
}

describe('MensagensPage', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.mocked(listConversas).mockResolvedValue([conversation]);
    vi.mocked(listEntities).mockResolvedValue([]);
    vi.mocked(listTerritorios).mockResolvedValue([{
      id: 4,
      workspaceId: 'territorio-a',
      nome: 'Nascente Sul',
      tipo: 'BAIRRO',
      cidade: 'Recife',
      bairro: null,
      estado: 'PE',
      pais: 'Brasil',
      latitude: null,
      longitude: null,
      boundingBox: [],
      status: 'ATIVO',
      updatedAt: null
    }]);
    vi.mocked(listMensagens).mockResolvedValue([remoteMessage]);
    vi.mocked(markConversaRead).mockRejectedValue(new Error('leitura indisponível'));
    vi.mocked(loadMessageDraft).mockResolvedValue(undefined);
    vi.mocked(listLocalMessages).mockResolvedValue([]);
    vi.mocked(cacheRemoteMessages).mockResolvedValue(undefined);
    vi.mocked(clearMessageDraft).mockResolvedValue(undefined);
    vi.mocked(getMessageAttachmentFile).mockResolvedValue(undefined);
    vi.mocked(searchMensagens).mockResolvedValue([]);
    vi.mocked(createConversa).mockResolvedValue(conversation);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows contextual unread state and only clears it after the read mutation succeeds', async () => {
    renderPage();

    expect(await screen.findByText('A nascente precisa de proteção.')).toBeInTheDocument();
    expect(screen.getByText('2 novas')).toBeInTheDocument();
    expect(screen.getByText('Território relacionado')).toBeInTheDocument();
    expect(markConversaRead).toHaveBeenCalledWith(12);
    expect(listMensagens).toHaveBeenCalledWith(12, 'territorio-a');
    expect(cacheRemoteMessages).toHaveBeenCalledWith('stable-owner', 'territorio-a', 12, 7, [remoteMessage]);
  });

  it('updates conversation controls when connectivity changes', async () => {
    renderPage();
    expect(await screen.findByText('Conectado')).toBeInTheDocument();
    const create = screen.getByRole('button', { name: 'Nova conversa' });
    expect(create).toBeEnabled();

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    fireEvent(window, new Event('offline'));

    expect(await screen.findByText('Trabalho offline')).toBeInTheDocument();
    expect(create).toBeDisabled();
  });

  it('restores a saved draft and its local attachment', async () => {
    vi.mocked(loadMessageDraft).mockResolvedValue({
      body: 'Confirmar horário do mutirão.',
      attachments: [new File(['ata'], 'ata.txt', { type: 'text/plain' })],
      linkedEntityType: 'TERRITORIO',
      linkedEntityId: '4',
      updatedAt: '2026-07-10T14:00:00Z'
    });

    renderPage();

    expect(await screen.findByDisplayValue('Confirmar horário do mutirão.')).toBeInTheDocument();
    expect(screen.getByText('ata.txt')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Vincular mensagem a' })).toHaveValue('TERRITORIO:4');
    expect(screen.getByText('Rascunho salvo neste aparelho')).toBeInTheDocument();
  });

  it('preserves a restored link while authorized contexts are still loading', async () => {
    const territories = deferred<Awaited<ReturnType<typeof listTerritorios>>>();
    vi.mocked(listTerritorios).mockReturnValue(territories.promise);
    vi.mocked(loadMessageDraft).mockResolvedValue({
      body: 'Confirmar vínculo.',
      attachments: [],
      linkedEntityType: 'TERRITORIO',
      linkedEntityId: '4',
      updatedAt: '2026-07-10T14:00:00Z'
    });
    vi.mocked(saveMessageDraft).mockResolvedValue(undefined);

    renderPage();
    await waitFor(() => expect(loadMessageDraft).toHaveBeenCalledWith(
      'stable-owner', 'territorio-a', 12
    ));
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    expect(saveMessageDraft).toHaveBeenCalledWith(
      'stable-owner',
      'territorio-a',
      12,
      'Confirmar vínculo.',
      undefined,
      { linkedEntityType: 'TERRITORIO', linkedEntityId: '4' }
    );
    territories.resolve([{
      id: 4,
      workspaceId: 'territorio-a',
      nome: 'Nascente Sul',
      tipo: 'BAIRRO',
      cidade: 'Recife',
      bairro: null,
      estado: 'PE',
      pais: 'Brasil',
      latitude: null,
      longitude: null,
      boundingBox: [],
      status: 'ATIVO',
      updatedAt: null
    }]);
  });

  it('keeps the composer protected and retries when the local draft cannot be read', async () => {
    vi.mocked(loadMessageDraft)
      .mockRejectedValueOnce(new Error('armazenamento indisponível'))
      .mockResolvedValueOnce(undefined);
    renderPage();

    const editor = await screen.findByLabelText('Mensagem');
    expect(await screen.findByRole('alert')).toHaveTextContent('armazenamento indisponível');
    expect(editor).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar rascunho' }));

    await waitFor(() => expect(loadMessageDraft).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(editor).toBeEnabled());
  });

  it('queues the selected authorized context with the message', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const draftLoad = deferred<Awaited<ReturnType<typeof loadMessageDraft>>>();
    vi.mocked(loadMessageDraft).mockReturnValue(draftLoad.promise);
    vi.mocked(captureMessage).mockResolvedValue({ clientMessageId: 'msg-linked', status: 'QUEUED' });
    renderPage();

    const editor = await screen.findByLabelText('Mensagem');
    const link = screen.getByRole('combobox', { name: 'Vincular mensagem a' });
    expect(editor).toBeDisabled();
    expect(link).toBeDisabled();
    draftLoad.resolve(undefined);
    await waitFor(() => expect(editor).toBeEnabled());
    fireEvent.change(link, {
      target: { value: 'TERRITORIO:4' }
    });
    fireEvent.change(editor, { target: { value: 'A nascente foi vistoriada.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar na fila' }));

    await waitFor(() => expect(captureMessage).toHaveBeenCalledWith({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'A nascente foi vistoriada.',
      attachments: [],
      linkedEntityType: 'TERRITORIO',
      linkedEntityId: '4'
    }));
    await waitFor(() => expect(link).toHaveValue(''));
  });

  it('shows the verified context recorded on a message', async () => {
    vi.mocked(listMensagens).mockResolvedValue([{
      ...remoteMessage,
      linkedEntityType: 'TERRITORIO',
      linkedEntityId: '4'
    }]);

    renderPage();

    expect(await screen.findByText('Vínculo: Território · Nascente Sul · Recife')).toBeInTheDocument();
  });

  it('shows a verified context on a message that is still local', async () => {
    vi.mocked(listLocalMessages).mockResolvedValue([{
      key: 'local-linked',
      ownerId: 'stable-owner',
      workspaceId: 'territorio-a',
      conversationId: 12,
      clientMessageId: 'local-linked',
      body: 'Registro ainda local.',
      occurredAt: '2026-07-10T13:55:00Z',
      deviceId: 'device-1',
      attachments: [],
      linkedEntityType: 'TERRITORIO',
      linkedEntityId: '4',
      syncStatus: 'QUEUED',
      updatedAt: '2026-07-10T13:55:00Z'
    }]);

    renderPage();

    expect(await screen.findByText('Registro ainda local.')).toBeInTheDocument();
    expect(screen.getByText('Vínculo: Território · Nascente Sul · Recife')).toBeInTheDocument();
  });

  it('clears the composer link when another conversation is opened', async () => {
    const secondConversation = { ...conversation, id: 13, titulo: 'Equipe de campo', unreadCount: 0 };
    vi.mocked(listConversas).mockResolvedValue([conversation, secondConversation]);
    vi.mocked(listMensagens).mockImplementation(async (id) => [{
      ...remoteMessage, id: id + 80, conversaId: id
    }]);
    renderPage();

    const link = await screen.findByRole('combobox', { name: 'Vincular mensagem a' });
    fireEvent.change(link, { target: { value: 'TERRITORIO:4' } });
    expect(link).toHaveValue('TERRITORIO:4');
    fireEvent.click(screen.getByRole('button', { name: /Equipe de campo/ }));

    await waitFor(() => expect(link).toHaveValue(''));
  });

  it('clears the composer link when the workspace changes', async () => {
    const view = renderPage('territorio-a');
    const link = await screen.findByRole('combobox', { name: 'Vincular mensagem a' });
    await waitFor(() => expect(link).toBeEnabled());
    fireEvent.change(link, { target: { value: 'TERRITORIO:4' } });
    expect(link).toHaveValue('TERRITORIO:4');

    view.rerender(<PageUnderTest workspaceId="territorio-b" />);

    await waitFor(() => expect(listConversas).toHaveBeenCalledWith('territorio-b'));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Vincular mensagem a' })).toHaveValue(''));
  });

  it('ignores completion of a draft save from the previous workspace', async () => {
    const pendingSave = deferred<void>();
    vi.mocked(saveMessageDraft).mockReturnValueOnce(pendingSave.promise);
    const view = renderPage('territorio-a');
    const editor = await screen.findByLabelText('Mensagem');
    fireEvent.change(editor, { target: { value: 'Rascunho do território A' } });
    await waitFor(() => expect(saveMessageDraft).toHaveBeenCalledWith(
      'stable-owner', 'territorio-a', 12, 'Rascunho do território A', undefined
    ));

    vi.mocked(listConversas).mockResolvedValue([]);
    view.rerender(<PageUnderTest workspaceId="territorio-b" />);
    pendingSave.resolve();

    await waitFor(() => expect(screen.queryByText('Rascunho salvo neste aparelho')).not.toBeInTheDocument());
  });

  it('waits for an active draft save before capturing the message', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const pendingSave = deferred<void>();
    vi.mocked(saveMessageDraft).mockReturnValueOnce(pendingSave.promise);
    vi.mocked(captureMessage).mockResolvedValue({ clientMessageId: 'msg-after-draft', status: 'QUEUED' });
    renderPage();

    const editor = await screen.findByLabelText('Mensagem');
    fireEvent.change(editor, { target: { value: 'Guardar sem ressuscitar o rascunho.' } });
    await waitFor(() => expect(saveMessageDraft).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar na fila' }));

    expect(captureMessage).not.toHaveBeenCalled();
    pendingSave.resolve();
    await waitFor(() => expect(captureMessage).toHaveBeenCalledWith({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Guardar sem ressuscitar o rascunho.',
      attachments: []
    }));
  });

  it('waits for every queued draft save before capturing the message', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const firstSave = deferred<void>();
    const secondSave = deferred<void>();
    vi.mocked(saveMessageDraft)
      .mockReturnValueOnce(firstSave.promise)
      .mockReturnValueOnce(secondSave.promise);
    vi.mocked(captureMessage).mockResolvedValue({ clientMessageId: 'msg-after-all-drafts', status: 'QUEUED' });
    renderPage();

    const editor = await screen.findByLabelText('Mensagem');
    await waitFor(() => expect(editor).toBeEnabled());
    fireEvent.change(editor, { target: { value: 'Primeira versão.' } });
    await waitFor(() => expect(saveMessageDraft).toHaveBeenCalledTimes(1));
    fireEvent.change(editor, { target: { value: 'Versão final.' } });
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 450)); });
    expect(saveMessageDraft).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar na fila' }));

    await act(async () => { firstSave.resolve(); });
    await waitFor(() => expect(saveMessageDraft).toHaveBeenCalledTimes(2));
    expect(captureMessage).not.toHaveBeenCalled();
    await act(async () => { secondSave.resolve(); });
    await waitFor(() => expect(captureMessage).toHaveBeenCalledWith({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Versão final.',
      attachments: []
    }));
  });

  it('keeps an offline send visible in the queue after the atomic capture succeeds', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const local = {
      key: 'local-queued',
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      conversationId: 12,
      clientMessageId: 'msg-local-1',
      body: 'Mensagem registrada offline.',
      occurredAt: '2026-07-10T14:10:00Z',
      deviceId: 'device-1',
      attachments: [],
      syncStatus: 'QUEUED' as const,
      updatedAt: '2026-07-10T14:10:00Z'
    };
    vi.mocked(listLocalMessages).mockResolvedValueOnce([]).mockResolvedValue([local]);
    vi.mocked(captureMessage).mockResolvedValue({ clientMessageId: 'msg-local-1', status: 'QUEUED' });

    renderPage();
    const editor = await screen.findByLabelText('Mensagem');
    fireEvent.change(editor, { target: { value: 'Mensagem registrada offline.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar na fila' }));

    await waitFor(() => expect(captureMessage).toHaveBeenCalledWith({
      workspaceId: 'territorio-a',
      conversationId: 12,
      body: 'Mensagem registrada offline.',
      attachments: []
    }));
    expect(editor).toHaveValue('');
    expect(await screen.findByText('Mensagem registrada offline.')).toBeInTheDocument();
    expect(screen.getByText('Na fila')).toBeInTheDocument();
  });

  it('searches message body, author and context through the workspace endpoint', async () => {
    vi.mocked(searchMensagens).mockResolvedValue([{
      conversaId: 12,
      titulo: 'Cuidado da nascente',
      contextEntityType: 'TERRITORIO',
      contextEntityId: '4',
      mensagemId: 91,
      corpo: 'A nascente precisa de proteção.',
      senderNome: 'Bia',
      occurredAt: '2026-07-10T13:50:00Z'
    }]);
    renderPage();

    const search = await screen.findByRole('searchbox', { name: 'Buscar nas conversas' });
    fireEvent.change(search, { target: { value: 'nascente' } });
    fireEvent.submit(search.closest('form')!);

    expect(await screen.findByText('Bia · Território')).toBeInTheDocument();
    expect(searchMensagens).toHaveBeenCalledWith('territorio-a', 'nascente');
  });

  it('uses the authorized conversation and message snapshot readers when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

    renderPage();

    expect((await screen.findAllByText('Cuidado da nascente')).length).toBeGreaterThan(0);
    expect(listConversas).toHaveBeenCalledWith('territorio-a');
    expect(listMensagens).toHaveBeenCalledWith(12, 'territorio-a');
  });

  it('reports unavailable conversation contexts instead of presenting them as an empty result', async () => {
    vi.mocked(listTerritorios).mockRejectedValue(new Error('contextos indisponíveis'));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('contextos indisponíveis');
    expect(screen.getByRole('button', { name: 'Nova conversa' })).toBeDisabled();
  });

  it('lets the user remove a restored link that is no longer available', async () => {
    vi.mocked(listTerritorios).mockRejectedValue(new Error('contextos indisponíveis'));
    vi.mocked(loadMessageDraft).mockResolvedValue({
      body: 'Revisar contexto.',
      attachments: [],
      linkedEntityType: 'MISSAO',
      linkedEntityId: '8',
      updatedAt: '2026-07-10T14:00:00Z'
    });
    vi.mocked(saveMessageDraft).mockResolvedValue(undefined);
    renderPage();

    expect(await screen.findByText(/O vínculo salvo não está disponível/)).toBeInTheDocument();
    const remove = screen.getByRole('button', { name: 'Remover vínculo salvo' });
    fireEvent.click(remove);

    expect(screen.getByRole('combobox', { name: 'Vincular mensagem a' })).toHaveValue('');
    await waitFor(() => expect(saveMessageDraft).toHaveBeenLastCalledWith(
      'stable-owner', 'territorio-a', 12, 'Revisar contexto.', undefined
    ));
  });

  it('does not let a late response from the previous conversation replace the active timeline', async () => {
    const secondConversation = { ...conversation, id: 13, titulo: 'Segunda conversa', unreadCount: 0 };
    const firstResponse = deferred<typeof remoteMessage[]>();
    const secondResponse = deferred<typeof remoteMessage[]>();
    vi.mocked(listConversas).mockResolvedValue([conversation, secondConversation]);
    vi.mocked(listMensagens).mockImplementation((id) => id === 12 ? firstResponse.promise : secondResponse.promise);
    vi.mocked(markConversaRead).mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Segunda conversa/ }));
    secondResponse.resolve([{ ...remoteMessage, id: 92, conversaId: 13, corpo: 'Resposta da conversa ativa.' }]);
    expect(await screen.findByText('Resposta da conversa ativa.')).toBeInTheDocument();

    firstResponse.resolve([{ ...remoteMessage, corpo: 'Resposta atrasada.' }]);
    await waitFor(() => expect(screen.queryByText('Resposta atrasada.')).not.toBeInTheDocument());
    expect(screen.getByText('Resposta da conversa ativa.')).toBeInTheDocument();
    expect(markConversaRead).toHaveBeenCalledWith(13);
    expect(markConversaRead).not.toHaveBeenCalledWith(12);
  });

  it('does not offer a queued message for duplicate submission if draft cleanup fails', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const local = {
      key: 'local-queued',
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      conversationId: 12,
      clientMessageId: 'msg-local-2',
      body: 'Já entrou na fila.',
      occurredAt: '2026-07-10T14:10:00Z',
      deviceId: 'device-1',
      attachments: [],
      syncStatus: 'QUEUED' as const,
      updatedAt: '2026-07-10T14:10:00Z'
    };
    vi.mocked(listLocalMessages).mockResolvedValueOnce([]).mockResolvedValue([local]);
    vi.mocked(captureMessage).mockResolvedValue({ clientMessageId: 'msg-local-2', status: 'QUEUED' });
    vi.mocked(clearMessageDraft).mockRejectedValue(new Error('falha ao limpar'));
    renderPage();

    const editor = await screen.findByLabelText('Mensagem');
    fireEvent.change(editor, { target: { value: 'Já entrou na fila.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar na fila' }));

    expect(await screen.findByText('Já entrou na fila.')).toBeInTheDocument();
    expect(editor).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Guardar na fila' })).toBeDisabled();
  });

  it('does not describe a missing local attachment as safely stored', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    vi.mocked(listLocalMessages).mockResolvedValue([{
      key: 'local-missing',
      ownerId: 'ana.sp',
      workspaceId: 'territorio-a',
      conversationId: 12,
      clientMessageId: 'msg-local-3',
      body: '',
      occurredAt: '2026-07-10T14:10:00Z',
      deviceId: 'device-1',
      attachments: [{ blobKey: 'missing', name: 'foto.png', type: 'image/png', size: 120 }],
      syncStatus: 'ACTION_REQUIRED',
      lastError: 'O anexo não está mais neste aparelho.',
      updatedAt: '2026-07-10T14:10:00Z'
    }]);

    renderPage();

    expect(await screen.findByText('foto.png')).toBeInTheDocument();
    expect(await screen.findByText(/arquivo indisponível/)).toBeInTheDocument();
    expect(screen.queryByText(/salvo localmente/)).not.toBeInTheDocument();
  });

  it('lets polling failures reach the backoff controller', async () => {
    vi.mocked(listMensagens).mockRejectedValue(new TypeError('sem rede'));
    renderPage();
    await screen.findByRole('heading', { name: 'Cuidado da nascente' });
    const poll = vi.mocked(startOnlinePolling).mock.calls[0][0];

    await expect(poll()).rejects.toThrow('sem rede');
  });

  it('polling marks newly loaded active messages and refreshes inactive unread badges', async () => {
    const inactive = { ...conversation, id: 13, titulo: 'Equipe de campo', unreadCount: 3 };
    renderPage();
    await screen.findByText('A nascente precisa de proteção.');
    vi.mocked(markConversaRead).mockClear().mockResolvedValue(undefined);
    vi.mocked(listConversas).mockClear().mockResolvedValue([{ ...conversation, unreadCount: 0 }, inactive]);
    const poll = vi.mocked(startOnlinePolling).mock.calls[0][0];

    await poll();

    expect(markConversaRead).toHaveBeenCalledWith(12);
    expect(listConversas).toHaveBeenCalledWith('territorio-a');
    expect(await screen.findByText('3 novas')).toBeInTheDocument();
  });

  it('backs off after a read receipt failure without skipping the badge refresh', async () => {
    renderPage();
    await screen.findByText('A nascente precisa de proteção.');
    vi.mocked(markConversaRead).mockClear().mockRejectedValue(new Error('leitura indisponível'));
    vi.mocked(listConversas).mockClear().mockResolvedValue([conversation]);
    const poll = vi.mocked(startOnlinePolling).mock.calls[0][0];

    await expect(poll()).rejects.toThrow('leitura indisponível');
    expect(listConversas).toHaveBeenCalledWith('territorio-a');
  });

  it('creates a conversation from a named mission context without exposing raw id fields', async () => {
    vi.mocked(listEntities).mockImplementation(async (path) => path === '/api/missoes'
      ? [{ id: 21, titulo: 'Recuperar a margem do rio' }]
      : []);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Nova conversa' }));
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Próxima mobilização' } });
    fireEvent.change(screen.getByLabelText('Contexto da conversa'), { target: { value: 'MISSAO:21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conversa' }));

    await waitFor(() => expect(createConversa).toHaveBeenCalledWith({
      workspaceId: 'territorio-a',
      territorioId: undefined,
      contextEntityType: 'MISSAO',
      contextEntityId: '21',
      titulo: 'Próxima mobilização',
      participanteRefs: []
    }));
    expect(screen.queryByLabelText(/identificador/i)).not.toBeInTheDocument();
  });

  it('closes the new conversation dialog on Escape and restores focus', async () => {
    renderPage();
    const opener = await screen.findByRole('button', { name: 'Nova conversa' });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Nova conversa' });
    expect(screen.getByLabelText('Assunto')).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Nova conversa' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('does not render a late conversation response from the previous workspace', async () => {
    const firstWorkspace = deferred<typeof conversation[]>();
    const secondWorkspace = deferred<typeof conversation[]>();
    const otherConversation = {
      ...conversation,
      id: 22,
      workspaceId: 'territorio-b',
      titulo: 'Conversa do território B',
      unreadCount: 0
    };
    vi.mocked(listConversas).mockImplementation((workspace) => workspace === 'territorio-a'
      ? firstWorkspace.promise
      : secondWorkspace.promise);
    const view = renderPage('territorio-a');
    await waitFor(() => expect(listConversas).toHaveBeenCalledWith('territorio-a'));

    view.rerender(<PageUnderTest workspaceId="territorio-b" />);
    await waitFor(() => expect(listConversas).toHaveBeenCalledWith('territorio-b'));
    secondWorkspace.resolve([otherConversation]);
    expect(await screen.findByRole('heading', { name: 'Conversa do território B' })).toBeInTheDocument();

    firstWorkspace.resolve([conversation]);
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Cuidado da nascente' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Conversa do território B' })).toBeInTheDocument();
  });
});
