import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent
} from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import {
  getSession,
  listConversas,
  listMensagens,
  listTerritorios,
  markConversaRead,
  searchMensagens
} from '../lib/api';
import { validateMessageFiles } from '../lib/messageFiles';
import { startOnlinePolling } from '../lib/messagePolling';
import {
  cacheConversations,
  cacheRemoteMessages,
  clearMessageDraft,
  listLocalMessages,
  loadCachedConversations,
  loadMessageDraft,
  saveMessageDraft
} from '../lib/offlineStore';
import { captureMessage, retryPendingMessages } from '../lib/offlineSync';
import type { Conversa, Mensagem, MensagemBusca, Territorio } from '../types';
import { LocalMessageAttachment } from './messages/LocalMessageAttachment';
import { NewConversationDialog } from './messages/NewConversationDialog';
import { RemoteMessageAttachments } from './messages/RemoteMessageAttachments';
import { SelectedMessageFile } from './messages/SelectedMessageFile';
import {
  contextLabel,
  fileSignature,
  LOCAL_MESSAGE_STATUS,
  mergeTimeline,
  when,
  type TimelineItem
} from './messages/messageView';

function ownerFromSession(): string | undefined {
  const session = getSession();
  return session?.angicoId || (session ? `pessoa-${session.pessoaId}` : undefined);
}

export default function MensagensPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const ownerId = ownerFromSession();
  const meId = getSession()?.pessoaId ?? null;
  const [conversations, setConversations] = useState<Conversa[]>([]);
  const [territories, setTerritories] = useState<Territorio[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [draftKey, setDraftKey] = useState<string>();
  const [draftState, setDraftState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const [usingCache, setUsingCache] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MensagemBusca[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const savedFilesSignature = useRef('');
  const activeConversationRef = useRef<number | null>(activeId);
  activeConversationRef.current = activeId;

  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;

  const refreshConversations = useCallback(async (background = false) => {
    if (!ownerId) {
      setError('Entre novamente para abrir as conversas deste aparelho.');
      setLoading(false);
      return;
    }
    if (!background) setLoading(true);
    setError(null);
    try {
      let conversationList: Conversa[];
      if (navigator.onLine) {
        conversationList = await listConversas(workspaceId);
        await cacheConversations(ownerId, workspaceId, conversationList);
        setUsingCache(false);
        try {
          setTerritories(await listTerritorios(workspaceId));
        } catch {
          setTerritories([]);
        }
      } else {
        conversationList = await loadCachedConversations(ownerId, workspaceId);
        setTerritories([]);
        setUsingCache(true);
      }
      setConversations(conversationList);
      setActiveId((current) => current && conversationList.some((entry) => entry.id === current)
        ? current
        : conversationList[0]?.id ?? null);
      if (!navigator.onLine && conversationList.length === 0) {
        setError('Nenhuma conversa confirmada está salva neste aparelho.');
      }
    } catch (caught) {
      const cached = await loadCachedConversations(ownerId, workspaceId);
      if (cached.length > 0) {
        setConversations(cached);
        setActiveId((current) => current && cached.some((entry) => entry.id === current)
          ? current
          : cached[0].id);
        setUsingCache(true);
      } else {
        setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as conversas.');
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, [ownerId, workspaceId]);

  const refreshMessages = useCallback(async (
    conversationId: number,
    markRead: boolean,
    propagateNetworkError = false
  ) => {
    if (!ownerId) return;
    const local = await listLocalMessages(ownerId, workspaceId, conversationId);
    let remote: Mensagem[] = [];
    let readFailed = false;
    let networkError: unknown;
    if (navigator.onLine) {
      try {
        remote = await listMensagens(conversationId);
        await cacheRemoteMessages(ownerId, workspaceId, conversationId, remote);
        if (markRead) {
          try {
            await markConversaRead(conversationId);
            setConversations((current) => current.map((conversation) => (
              conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
            )));
          } catch {
            readFailed = true;
          }
        }
      } catch (caught) {
        networkError = caught;
        if (activeConversationRef.current === conversationId) {
          setMessageError(caught instanceof Error ? caught.message : 'Não foi possível atualizar as mensagens.');
        }
      }
    }
    const refreshedLocal = remote.length > 0
      ? await listLocalMessages(ownerId, workspaceId, conversationId)
      : local;
    if (activeConversationRef.current !== conversationId) {
      if (networkError && propagateNetworkError) throw networkError;
      return;
    }
    setTimeline(mergeTimeline(remote, refreshedLocal));
    if (!readFailed && remote.length > 0) setMessageError(null);
    if (networkError && propagateNetworkError) throw networkError;
  }, [ownerId, workspaceId]);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (activeId == null || !ownerId) {
      setTimeline([]);
      return;
    }
    let activeEffect = true;
    setMessageLoading(true);
    setMessageError(null);
    void refreshMessages(activeId, true).finally(() => {
      if (activeEffect) setMessageLoading(false);
    });
    const stop = startOnlinePolling(async () => {
      await refreshMessages(activeId, false, true);
    });
    return () => {
      activeEffect = false;
      stop();
    };
  }, [activeId, ownerId, refreshMessages]);

  useEffect(() => {
    if (activeId == null || !ownerId) return;
    const key = `${ownerId}:${workspaceId}:${activeId}`;
    setDraftKey(undefined);
    setDraft('');
    setFiles([]);
    setDraftState('idle');
    savedFilesSignature.current = '';
    let activeEffect = true;
    void loadMessageDraft(ownerId, workspaceId, activeId).then((saved) => {
      if (!activeEffect) return;
      setDraft(saved?.body ?? '');
      setFiles(saved?.attachments ?? []);
      savedFilesSignature.current = fileSignature(saved?.attachments ?? []);
      setDraftState(saved && (saved.body || saved.attachments.length) ? 'saved' : 'idle');
      setDraftKey(key);
    });
    return () => { activeEffect = false; };
  }, [activeId, ownerId, workspaceId]);

  useEffect(() => {
    if (activeId == null || !ownerId || draftKey !== `${ownerId}:${workspaceId}:${activeId}`) return;
    const timer = window.setTimeout(() => {
      if (!draft.trim() && files.length === 0) {
        void clearMessageDraft(ownerId, workspaceId, activeId)
          .then(() => setDraftState('idle'))
          .catch(() => setDraftState('error'));
        return;
      }
      setDraftState('saving');
      const nextFilesSignature = fileSignature(files);
      const filesChanged = nextFilesSignature !== savedFilesSignature.current;
      void saveMessageDraft(ownerId, workspaceId, activeId, draft, filesChanged ? files : undefined)
        .then(() => {
          savedFilesSignature.current = nextFilesSignature;
          setDraftState('saved');
        })
        .catch((caught) => {
          setDraftState('error');
          setMessageError(caught instanceof Error ? caught.message : 'Não foi possível salvar o rascunho.');
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [activeId, draft, draftKey, files, ownerId, workspaceId]);

  useEffect(() => {
    const stream = streamRef.current;
    if (stream && typeof stream.scrollTo === 'function') {
      stream.scrollTo({ top: stream.scrollHeight });
    }
  }, [timeline]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (activeId == null || !ownerId || (!draft.trim() && files.length === 0)) return;
    setSending(true);
    setMessageError(null);
    try {
      await captureMessage({ workspaceId, conversationId: activeId, body: draft, attachments: files });
      setDraft('');
      setFiles([]);
      savedFilesSignature.current = '';
      setDraftState('idle');
      await refreshMessages(activeId, false);
      if (navigator.onLine) await refreshConversations(true);
    } catch (caught) {
      setMessageError(caught instanceof Error ? caught.message : 'Não foi possível guardar a mensagem.');
    } finally {
      setSending(false);
    }
  }

  async function retryMessages() {
    if (!ownerId) return;
    setSending(true);
    setMessageError(null);
    try {
      await retryPendingMessages(ownerId, workspaceId);
      if (activeId != null) await refreshMessages(activeId, false);
    } catch (caught) {
      setMessageError(caught instanceof Error ? caught.message : 'Não foi possível reenviar as mensagens.');
    } finally {
      setSending(false);
    }
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (!navigator.onLine) {
      setSearchError('A busca no histórico precisa de conexão. O conteúdo salvo continua disponível abaixo.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      setSearchResults(await searchMensagens(workspaceId, searchQuery));
    } catch (caught) {
      setSearchError(caught instanceof Error ? caught.message : 'Não foi possível buscar nas conversas.');
    } finally {
      setSearching(false);
    }
  }

  function selectFiles(next: File[]) {
    try {
      validateMessageFiles(next);
      setFiles(next);
      setMessageError(null);
    } catch (caught) {
      setMessageError(caught instanceof Error ? caught.message : 'Anexo inválido.');
    }
  }

  const hasRetryable = timeline.some((item) => item.kind === 'local'
    && ['RETRYABLE_ERROR', 'BLOCKED'].includes(item.message.syncStatus));

  return (
    <div className="page messages-page">
      <header className="page-head messages-head">
        <div>
          <span className="overline">Coordenação coletiva</span>
          <h1>Conversas</h1>
          <p>Trocas ligadas ao trabalho real. O que for enviado entra na memória operacional.</p>
        </div>
        <button className="primary-button" disabled={!navigator.onLine || territories.length === 0} onClick={() => setShowNew(true)}>Nova conversa</button>
      </header>

      <form className="message-search" role="search" onSubmit={handleSearch}>
        <label htmlFor="message-search">Buscar nas conversas</label>
        <div>
          <input id="message-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Assunto, mensagem, pessoa ou contexto" />
          <button type="submit" className="secondary-button" disabled={searching}>{searching ? 'Buscando…' : 'Buscar'}</button>
        </div>
        {searchError && <small role="alert">{searchError}</small>}
      </form>

      {searchResults.length > 0 && (
        <section className="message-search-results" aria-label="Resultados da busca">
          <header><b>{searchResults.length} resultado{searchResults.length === 1 ? '' : 's'}</b><button type="button" onClick={() => setSearchResults([])}>Fechar</button></header>
          {searchResults.map((result, index) => (
            <button type="button" key={`${result.conversaId}-${result.mensagemId ?? index}`} onClick={() => {
              setActiveId(result.conversaId);
              setSearchResults([]);
            }}>
              <b>{result.titulo}</b>
              {result.corpo && <p>{result.corpo}</p>}
              <span>{result.senderNome ?? 'Conversa'} · {contextLabel(result.contextEntityType)}</span>
            </button>
          ))}
        </section>
      )}

      {usingCache && <div className="offline-message-note" role="status"><b>Dados salvos neste aparelho</b><span>Novas mensagens serão enviadas quando a conexão voltar.</span></div>}

      {loading ? <LoadingState label="Carregando conversas…" /> : error && conversations.length === 0 ? (
        <ErrorState message={error} onRetry={() => void refreshConversations()} />
      ) : conversations.length === 0 ? (
        <EmptyState
          title={territories.length === 0 ? 'Nenhuma conversa disponível' : 'Nenhuma conversa iniciada'}
          message={navigator.onLine ? 'Crie uma conversa ligada a um território existente.' : 'Conecte este aparelho uma vez para guardar as conversas autorizadas.'}
          action={territories.length > 0 ? <button className="secondary-button" onClick={() => setShowNew(true)}>Nova conversa</button> : undefined}
        />
      ) : (
        <div className="message-layout">
          <aside className="thread-list" aria-label="Conversas">
            {conversations.map((conversation) => (
              <button type="button" key={conversation.id} className={conversation.id === activeId ? 'active' : ''} onClick={() => setActiveId(conversation.id)}>
                <b>{conversation.titulo}</b>
                <span>{contextLabel(conversation.contextEntityType)} · atualizada {when(conversation.updatedAt)}</span>
                {conversation.unreadCount > 0 && <em>{conversation.unreadCount} {conversation.unreadCount === 1 ? 'nova' : 'novas'}</em>}
              </button>
            ))}
          </aside>
          <section className="chat-panel">
            {active && (
              <>
                <header className="chat-head">
                  <div><span className="overline">{contextLabel(active.contextEntityType)} relacionado</span><h2>{active.titulo}</h2></div>
                  <span>{navigator.onLine ? 'Conectado' : 'Trabalho offline'}</span>
                </header>
                <div className="message-stream" ref={streamRef}>
                  {messageLoading ? <LoadingState label="Carregando mensagens…" /> : timeline.length === 0 ? (
                    <EmptyState title="A conversa ainda está vazia" message="Envie a primeira mensagem quando houver algo a coordenar." />
                  ) : timeline.map((item) => {
                    if (item.kind === 'remote') {
                      const message = item.message;
                      const mine = meId != null && message.senderPessoaId === meId;
                      return (
                        <article key={item.key} className={`message-bubble ${mine ? 'mine' : ''}`}>
                          <header><b>{mine ? 'Você' : message.senderNome ?? 'Participante'}</b><time dateTime={message.occurredAt}>{when(message.occurredAt)}</time></header>
                          {message.corpo && <p>{message.corpo}</p>}
                          {message.anexos.length > 0 && <RemoteMessageAttachments attachments={message.anexos} />}
                          <footer className="message-provenance"><span>Enviada</span><time dateTime={message.recordedAt}>registrada {when(message.recordedAt)}</time></footer>
                        </article>
                      );
                    }
                    const message = item.message;
                    const status = LOCAL_MESSAGE_STATUS[message.syncStatus] ?? { label: 'Salva localmente', tone: 'pending' };
                    return (
                      <article key={item.key} className="message-bubble mine local-message">
                        <header><b>Você</b><time dateTime={message.occurredAt}>{when(message.occurredAt)}</time></header>
                        {message.body && <p>{message.body}</p>}
                        {message.attachments.length > 0 && <div className="attachment-list">{message.attachments.map((attachment) => (
                          <LocalMessageAttachment
                            key={attachment.blobKey}
                            attachment={attachment}
                            ownerId={message.ownerId}
                            workspaceId={message.workspaceId}
                          />
                        ))}</div>}
                        <footer className={`message-provenance ${status.tone}`}><span>{status.label}</span><small>{message.lastError}</small></footer>
                      </article>
                    );
                  })}
                </div>
                <form className="message-composer" onSubmit={handleSend}>
                  {files.length > 0 && <div className="selected-files">{files.map((file, index) => (
                    <SelectedMessageFile key={`${file.name}-${file.size}-${index}`} file={file} onRemove={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} />
                  ))}</div>}
                  {messageError && <div className="form-error" role="alert">{messageError}</div>}
                  <div className="draft-state" role="status">
                    {draftState === 'saving' && 'Salvando rascunho…'}
                    {draftState === 'saved' && 'Rascunho salvo neste aparelho'}
                    {draftState === 'error' && 'Rascunho não salvo'}
                  </div>
                  <label htmlFor="message-draft">Mensagem</label>
                  <textarea id="message-draft" rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva apenas o que precisa ficar registrado…" />
                  <footer>
                    <label className="ghost-button">Anexar evidência<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" multiple hidden onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} /></label>
                    <button type="submit" className="primary-button" disabled={sending || (!draft.trim() && files.length === 0)}>{sending ? 'Guardando…' : navigator.onLine ? 'Enviar mensagem' : 'Guardar na fila'}</button>
                  </footer>
                  {hasRetryable && navigator.onLine && <button type="button" className="message-retry" disabled={sending} onClick={() => void retryMessages()}>Tentar reenviar mensagens pendentes</button>}
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {showNew && <NewConversationDialog
        workspaceId={workspaceId}
        territories={territories}
        onClose={() => setShowNew(false)}
        onCreated={(conversation) => {
          setShowNew(false);
          setConversations((current) => [conversation, ...current]);
          setActiveId(conversation.id);
        }}
      />}
    </div>
  );
}
