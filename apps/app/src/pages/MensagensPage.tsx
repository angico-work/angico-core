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
  listEntities,
  listMensagens,
  listTerritorios,
  markConversaRead,
  searchMensagens,
  sessionOwnerId
} from '../lib/api';
import { validateMessageFiles } from '../lib/messageFiles';
import { startOnlinePolling } from '../lib/messagePolling';
import {
  cacheRemoteMessages,
  clearMessageDraft,
  listLocalMessages,
  loadMessageDraft,
  saveMessageDraft
} from '../lib/offlineStore';
import { captureMessage, retryPendingMessages } from '../lib/offlineSync';
import type { Conversa, Mensagem, MensagemBusca } from '../types';
import { LocalMessageAttachment } from './messages/LocalMessageAttachment';
import { NewConversationDialog } from './messages/NewConversationDialog';
import { RemoteMessageAttachments } from './messages/RemoteMessageAttachments';
import { SelectedMessageFile } from './messages/SelectedMessageFile';
import {
  contextLabel,
  conversationContexts,
  fileSignature,
  LOCAL_MESSAGE_STATUS,
  mergeTimeline,
  when,
  type ConversationContext,
  type TimelineItem
} from './messages/messageView';

export default function MensagensPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const ownerId = sessionOwnerId();
  const meId = getSession()?.pessoaId ?? null;
  const [conversations, setConversations] = useState<Conversa[]>([]);
  const [contexts, setContexts] = useState<ConversationContext[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [draftKey, setDraftKey] = useState<string>();
  const [draftState, setDraftState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MensagemBusca[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const savedFilesSignature = useRef('');
  const draftSaveTimer = useRef<number | undefined>(undefined);
  const draftSaveGeneration = useRef(0);
  const activeConversationRef = useRef<number | null>(activeId);
  const activeWorkspaceRef = useRef(workspaceId);
  activeConversationRef.current = activeId;
  activeWorkspaceRef.current = workspaceId;

  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;

  const refreshConversations = useCallback(async (background = false) => {
    const requestedWorkspace = workspaceId;
    if (!ownerId) {
      setError('Entre novamente para abrir as conversas deste aparelho.');
      setLoading(false);
      return;
    }
    if (!background) setLoading(true);
    setError(null);
    setContextError(null);
    try {
      const conversationList = await listConversas(workspaceId);
      if (activeWorkspaceRef.current !== requestedWorkspace) return;
      setConversations(conversationList);
      setActiveId((current) => current && conversationList.some((entry) => entry.id === current)
        ? current
        : conversationList[0]?.id ?? null);
      try {
        const [territories, observations, problems, potentialities, missions, actions, results, indicators] = await Promise.all([
          listTerritorios(workspaceId),
          listEntities<Record<string, unknown>>('/api/observacoes', workspaceId),
          listEntities<Record<string, unknown>>('/api/problemas', workspaceId),
          listEntities<Record<string, unknown>>('/api/potencialidades', workspaceId),
          listEntities<Record<string, unknown>>('/api/missoes', workspaceId),
          listEntities<Record<string, unknown>>('/api/acoes', workspaceId),
          listEntities<Record<string, unknown>>('/api/resultados', workspaceId),
          listEntities<Record<string, unknown>>('/api/indicadores', workspaceId)
        ]);
        if (activeWorkspaceRef.current !== requestedWorkspace) return;
        setContexts(conversationContexts(territories, [
          { type: 'OBSERVACAO', label: 'Observação', entities: observations },
          { type: 'PROBLEMA', label: 'Problema', entities: problems },
          { type: 'POTENCIALIDADE', label: 'Potencialidade', entities: potentialities },
          { type: 'MISSAO', label: 'Missão', entities: missions },
          { type: 'ACAO', label: 'Ação', entities: actions },
          { type: 'RESULTADO', label: 'Resultado', entities: results },
          { type: 'INDICADOR', label: 'Indicador', entities: indicators }
        ]));
      } catch (caught) {
        if (activeWorkspaceRef.current !== requestedWorkspace) return;
        setContexts([]);
        setContextError(caught instanceof Error ? caught.message : 'Não foi possível carregar os contextos das conversas.');
      }
    } catch (caught) {
      if (activeWorkspaceRef.current !== requestedWorkspace) return;
      setConversations([]);
      setActiveId(null);
      setContexts([]);
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as conversas.');
    } finally {
      if (!background && activeWorkspaceRef.current === requestedWorkspace) setLoading(false);
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
    try {
      remote = await listMensagens(conversationId, workspaceId);
      await cacheRemoteMessages(ownerId, workspaceId, conversationId, meId, remote);
      if (navigator.onLine
          && markRead
          && activeConversationRef.current === conversationId
          && activeWorkspaceRef.current === workspaceId) {
        try {
          await markConversaRead(conversationId);
          setConversations((current) => current.map((conversation) => (
            conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
          )));
        } catch (caught) {
          readFailed = true;
          if (propagateNetworkError) networkError = caught;
        }
      }
    } catch (caught) {
      networkError = caught;
      if (activeConversationRef.current === conversationId
        && activeWorkspaceRef.current === workspaceId) {
        setMessageError(caught instanceof Error ? caught.message : 'Não foi possível atualizar as mensagens.');
      }
    }
    const refreshedLocal = remote.length > 0
      ? await listLocalMessages(ownerId, workspaceId, conversationId)
      : local;
    if (activeConversationRef.current !== conversationId
      || activeWorkspaceRef.current !== workspaceId) {
      if (networkError && propagateNetworkError) throw networkError;
      return;
    }
    setTimeline(mergeTimeline(remote, refreshedLocal, meId));
    if (!readFailed && !networkError) setMessageError(null);
    if (networkError && propagateNetworkError) throw networkError;
  }, [meId, ownerId, workspaceId]);

  const refreshConversationBadges = useCallback(async () => {
    if (!navigator.onLine) return;
    const next = await listConversas(workspaceId);
    if (activeWorkspaceRef.current !== workspaceId) return;
    setConversations(next);
    setActiveId((current) => current && next.some((conversation) => conversation.id === current)
      ? current
      : next[0]?.id ?? null);
  }, [workspaceId]);

  useEffect(() => {
    setConversations([]);
    setContexts([]);
    setActiveId(null);
    setTimeline([]);
    setShowNew(false);
    setSearching(false);
    setSearchQuery('');
    setSearchError(null);
    setSearchResults([]);
  }, [workspaceId]);

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
      let pollingError: unknown;
      try {
        await refreshMessages(activeId, true, true);
      } catch (caught) {
        pollingError = caught;
      }
      try {
        await refreshConversationBadges();
      } catch (caught) {
        pollingError ??= caught;
      }
      if (pollingError) throw pollingError;
    });
    return () => {
      activeEffect = false;
      stop();
    };
  }, [activeId, ownerId, refreshConversationBadges, refreshMessages]);

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
    if (activeId == null
      || !ownerId
      || sending
      || draftKey !== `${ownerId}:${workspaceId}:${activeId}`) return;
    const generation = ++draftSaveGeneration.current;
    const stillCurrent = () => draftSaveGeneration.current === generation
      && activeWorkspaceRef.current === workspaceId
      && activeConversationRef.current === activeId;
    const timer = window.setTimeout(() => {
      if (!draft.trim() && files.length === 0) {
        void clearMessageDraft(ownerId, workspaceId, activeId)
          .then(() => { if (stillCurrent()) setDraftState('idle'); })
          .catch(() => { if (stillCurrent()) setDraftState('error'); });
        return;
      }
      setDraftState('saving');
      const nextFilesSignature = fileSignature(files);
      const filesChanged = nextFilesSignature !== savedFilesSignature.current;
      void saveMessageDraft(ownerId, workspaceId, activeId, draft, filesChanged ? files : undefined)
        .then(() => {
          if (!stillCurrent()) return;
          savedFilesSignature.current = nextFilesSignature;
          setDraftState('saved');
        })
        .catch((caught) => {
          if (!stillCurrent()) return;
          setDraftState('error');
          setMessageError(caught instanceof Error ? caught.message : 'Não foi possível salvar o rascunho.');
        });
    }, 400);
    draftSaveTimer.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (draftSaveGeneration.current === generation) draftSaveGeneration.current += 1;
      if (draftSaveTimer.current === timer) draftSaveTimer.current = undefined;
    };
  }, [activeId, draft, draftKey, files, ownerId, sending, workspaceId]);

  useEffect(() => {
    const stream = streamRef.current;
    if (stream && typeof stream.scrollTo === 'function') {
      stream.scrollTo({ top: stream.scrollHeight });
    }
  }, [timeline]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (activeId == null || !ownerId || (!draft.trim() && files.length === 0)) return;
    const requestedWorkspace = workspaceId;
    const requestedConversation = activeId;
    if (draftSaveTimer.current !== undefined) {
      window.clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = undefined;
    }
    setSending(true);
    setMessageError(null);
    try {
      await captureMessage({ workspaceId, conversationId: activeId, body: draft, attachments: files });
      if (activeWorkspaceRef.current !== requestedWorkspace
        || activeConversationRef.current !== requestedConversation) return;
      setDraft('');
      setFiles([]);
      savedFilesSignature.current = '';
      setDraftState('idle');
      await refreshMessages(activeId, false);
      if (navigator.onLine) await refreshConversations(true);
    } catch (caught) {
      if (activeWorkspaceRef.current === requestedWorkspace) {
        setMessageError(caught instanceof Error ? caught.message : 'Não foi possível guardar a mensagem.');
      }
    } finally {
      setSending(false);
    }
  }

  async function retryMessages() {
    if (!ownerId) return;
    const requestedWorkspace = workspaceId;
    setSending(true);
    setMessageError(null);
    try {
      await retryPendingMessages(ownerId, workspaceId);
      if (activeWorkspaceRef.current !== requestedWorkspace) return;
      if (activeId != null) await refreshMessages(activeId, false);
    } catch (caught) {
      if (activeWorkspaceRef.current === requestedWorkspace) {
        setMessageError(caught instanceof Error ? caught.message : 'Não foi possível reenviar as mensagens.');
      }
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
    const requestedWorkspace = workspaceId;
    try {
      const results = await searchMensagens(workspaceId, searchQuery);
      if (activeWorkspaceRef.current === requestedWorkspace) setSearchResults(results);
    } catch (caught) {
      if (activeWorkspaceRef.current === requestedWorkspace) {
        setSearchError(caught instanceof Error ? caught.message : 'Não foi possível buscar nas conversas.');
      }
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
        <button className="primary-button" disabled={!navigator.onLine || contexts.length === 0} onClick={() => setShowNew(true)}>Nova conversa</button>
      </header>

      {contextError && <div className="form-error" role="alert">{contextError}</div>}

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

      {loading ? <LoadingState label="Carregando conversas…" /> : error && conversations.length === 0 ? (
        <ErrorState message={error} onRetry={() => void refreshConversations()} />
      ) : conversations.length === 0 ? (
        <EmptyState
          title={contexts.length === 0 ? 'Nenhuma conversa disponível' : 'Nenhuma conversa iniciada'}
          message={navigator.onLine ? 'Crie uma conversa ligada a um território, missão ou ação existente.' : 'Conecte este aparelho uma vez para guardar as conversas autorizadas.'}
          action={contexts.length > 0 ? <button className="secondary-button" onClick={() => setShowNew(true)}>Nova conversa</button> : undefined}
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
        contexts={contexts}
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
