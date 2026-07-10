import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MensagensPage from './MensagensPage';
import {
  createConversa,
  listConversas,
  listMensagens,
  listTerritorios,
  markConversaRead,
  searchMensagens
} from '../lib/api';
import {
  cacheConversations,
  cacheRemoteMessages,
  clearMessageDraft,
  getMessageAttachmentFile,
  listLocalMessages,
  loadCachedConversations,
  loadMessageDraft
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
    listMensagens: vi.fn(),
    listTerritorios: vi.fn(),
    markConversaRead: vi.fn(),
    searchMensagens: vi.fn()
  };
});

vi.mock('../lib/offlineStore', () => ({
  cacheConversations: vi.fn(),
  cacheRemoteMessages: vi.fn(),
  clearMessageDraft: vi.fn(),
  getMessageAttachmentFile: vi.fn(),
  listLocalMessages: vi.fn(),
  loadCachedConversations: vi.fn(),
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Outlet context={{ workspaceId: 'territorio-a' }} />}>
          <Route index element={<MensagensPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('MensagensPage', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.mocked(listConversas).mockResolvedValue([conversation]);
    vi.mocked(listTerritorios).mockResolvedValue([{ id: 4, workspaceId: 'territorio-a', nome: 'Nascente Sul', cidade: 'Recife', estado: 'PE', status: 'ATIVO' }]);
    vi.mocked(listMensagens).mockResolvedValue([remoteMessage]);
    vi.mocked(markConversaRead).mockRejectedValue(new Error('leitura indisponível'));
    vi.mocked(loadCachedConversations).mockResolvedValue([]);
    vi.mocked(loadMessageDraft).mockResolvedValue(undefined);
    vi.mocked(listLocalMessages).mockResolvedValue([]);
    vi.mocked(cacheConversations).mockResolvedValue(undefined);
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
    expect(cacheRemoteMessages).toHaveBeenCalledWith('ana.sp', 'territorio-a', 12, [remoteMessage]);
  });

  it('restores a saved draft and its local attachment', async () => {
    vi.mocked(loadMessageDraft).mockResolvedValue({
      body: 'Confirmar horário do mutirão.',
      attachments: [new File(['ata'], 'ata.txt', { type: 'text/plain' })],
      updatedAt: '2026-07-10T14:00:00Z'
    });

    renderPage();

    expect(await screen.findByDisplayValue('Confirmar horário do mutirão.')).toBeInTheDocument();
    expect(screen.getByText('ata.txt')).toBeInTheDocument();
    expect(screen.getByText('Rascunho salvo neste aparelho')).toBeInTheDocument();
  });

  it('keeps an offline send visible in the queue after the atomic capture succeeds', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    vi.mocked(loadCachedConversations).mockResolvedValue([conversation]);
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

  it('falls back to the last confirmed conversation list when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    vi.mocked(listConversas).mockRejectedValue(new TypeError('offline'));
    vi.mocked(listTerritorios).mockRejectedValue(new TypeError('offline'));
    vi.mocked(loadCachedConversations).mockResolvedValue([conversation]);

    renderPage();

    expect((await screen.findAllByText('Cuidado da nascente')).length).toBeGreaterThan(0);
    expect(screen.getByText('Dados salvos neste aparelho')).toBeInTheDocument();
    expect(cacheConversations).not.toHaveBeenCalled();
  });

  it('does not let a late response from the previous conversation replace the active timeline', async () => {
    const secondConversation = { ...conversation, id: 13, titulo: 'Segunda conversa', unreadCount: 0 };
    const firstResponse = deferred<typeof remoteMessage[]>();
    const secondResponse = deferred<typeof remoteMessage[]>();
    vi.mocked(listConversas).mockResolvedValue([conversation, secondConversation]);
    vi.mocked(listMensagens).mockImplementation((id) => id === 12 ? firstResponse.promise : secondResponse.promise);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Segunda conversa/ }));
    secondResponse.resolve([{ ...remoteMessage, id: 92, conversaId: 13, corpo: 'Resposta da conversa ativa.' }]);
    expect(await screen.findByText('Resposta da conversa ativa.')).toBeInTheDocument();

    firstResponse.resolve([{ ...remoteMessage, corpo: 'Resposta atrasada.' }]);
    await waitFor(() => expect(screen.queryByText('Resposta atrasada.')).not.toBeInTheDocument());
    expect(screen.getByText('Resposta da conversa ativa.')).toBeInTheDocument();
  });

  it('does not offer a queued message for duplicate submission if draft cleanup fails', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    vi.mocked(loadCachedConversations).mockResolvedValue([conversation]);
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
    vi.mocked(loadCachedConversations).mockResolvedValue([conversation]);
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
});
