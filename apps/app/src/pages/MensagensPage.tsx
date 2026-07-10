import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import {
  attachmentUrl, createConversa, getSession, listConversas, listMensagens, listTerritorios, sendMensagem
} from '../lib/api';
import type { Conversa, Mensagem, Territorio } from '../types';

function NewConversationDialog({ workspaceId, territories, onClose, onCreated }: {
  workspaceId: string; territories: Territorio[]; onClose: () => void; onCreated: (conversation: Conversa) => void;
}) {
  const [title, setTitle] = useState('');
  const [territoryId, setTerritoryId] = useState(() => territories[0]?.id ?? 0);
  const [participants, setParticipants] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!territoryId) return;
    setSubmitting(true);
    setError(null);
    const refs = participants.split(/[,;\s]+/).map((value) => value.trim().replace(/^@/, '')).filter(Boolean);
    try {
      onCreated(await createConversa({ workspaceId, territorioId: territoryId, titulo: title.trim(), participanteRefs: refs }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar a conversa.');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="conversation-title">
        <header className="dialog-head"><div><span className="overline">Coordenação no território</span><h2 id="conversation-title">Nova conversa</h2></div><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>×</button></header>
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="conversation-name">Assunto</label><input id="conversation-name" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Organização do mutirão" /></div>
          <div className="field"><label htmlFor="conversation-territory">Território relacionado</label><select id="conversation-territory" value={territoryId} onChange={(event) => setTerritoryId(Number(event.target.value))}>{territories.map((territory) => <option key={territory.id} value={territory.id}>{territory.nome}{territory.cidade ? ` · ${territory.cidade}` : ''}</option>)}</select></div>
          <div className="field"><label htmlFor="conversation-participants">Participantes <span>opcional</span></label><input id="conversation-participants" value={participants} onChange={(event) => setParticipants(event.target.value)} placeholder="@maria, @cooperativa" /><small>Use identidades Angico separadas por vírgula.</small></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <footer className="dialog-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={submitting || !territoryId}>{submitting ? 'Criando…' : 'Criar conversa'}</button></footer>
        </form>
      </section>
    </div>
  );
}

function when(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function MensagensPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [conversations, setConversations] = useState<Conversa[]>([]);
  const [territories, setTerritories] = useState<Territorio[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const meId = getSession()?.pessoaId ?? null;

  const refreshConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [conversationList, territoryList] = await Promise.all([listConversas(workspaceId), listTerritorios(workspaceId)]);
      setConversations(conversationList);
      setTerritories(territoryList);
      setActiveId((current) => current && conversationList.some((entry) => entry.id === current) ? current : conversationList[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as conversas.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refreshConversations(); }, [refreshConversations]);
  useEffect(() => {
    if (activeId == null) { setMessages([]); return; }
    setMessageLoading(true);
    setMessageError(null);
    void listMensagens(activeId).then(setMessages).catch((caught) => {
      setMessages([]);
      setMessageError(caught instanceof Error ? caught.message : 'Não foi possível carregar as mensagens.');
    }).finally(() => setMessageLoading(false));
  }, [activeId]);
  useEffect(() => { streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight }); }, [messages]);

  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (activeId == null || (!draft.trim() && files.length === 0)) return;
    setSending(true);
    setMessageError(null);
    try {
      const sent = await sendMensagem(activeId, draft, files);
      setMessages((current) => [...current, sent]);
      setDraft('');
      setFiles([]);
      await refreshConversations();
    } catch (caught) {
      setMessageError(caught instanceof Error ? caught.message : 'Não foi possível enviar.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page messages-page">
      <header className="page-head">
        <div><span className="overline">Coordenação coletiva</span><h1>Conversas</h1><p>Trocas relacionadas a territórios reais. Mensagens enviadas ficam na memória operacional.</p></div>
        <button className="primary-button" disabled={territories.length === 0} onClick={() => setShowNew(true)}>Nova conversa</button>
      </header>

      {loading ? <LoadingState label="Carregando conversas…" /> : error ? <ErrorState message={error} onRetry={() => void refreshConversations()} /> : territories.length === 0 ? (
        <EmptyState title="Nenhum território disponível" message="Uma conversa precisa estar ligada a um território existente. Cadastre esse contexto antes de conversar." />
      ) : conversations.length === 0 ? (
        <EmptyState title="Nenhuma conversa iniciada" message="Crie uma conversa para coordenar uma ação ou missão no território." action={<button className="secondary-button" onClick={() => setShowNew(true)}>Nova conversa</button>} />
      ) : (
        <div className="message-layout">
          <aside className="thread-list" aria-label="Conversas">
            {conversations.map((conversation) => (
              <button type="button" key={conversation.id} className={conversation.id === activeId ? 'active' : ''} onClick={() => setActiveId(conversation.id)}>
                <b>{conversation.titulo}</b><span>Atualizada {when(conversation.updatedAt)}</span>
              </button>
            ))}
          </aside>
          <section className="chat-panel">
            {active && (
              <>
                <header className="chat-head"><div><span className="overline">Conversa ativa</span><h2>{active.titulo}</h2></div><span>{active.status}</span></header>
                <div className="message-stream" ref={streamRef}>
                  {messageLoading ? <LoadingState label="Carregando mensagens…" /> : messageError && messages.length === 0 ? <ErrorState message={messageError} /> : messages.length === 0 ? <EmptyState title="A conversa ainda está vazia" message="Envie a primeira mensagem quando houver algo a coordenar." /> : messages.map((message) => {
                    const mine = meId != null && message.senderPessoaId === meId;
                    return (
                      <article key={message.id} className={`message-bubble ${mine ? 'mine' : ''}`}>
                        <header><b>{mine ? 'Você' : message.senderNome ?? 'Participante'}</b><time dateTime={message.createdAt}>{when(message.createdAt)}</time></header>
                        {message.corpo && <p>{message.corpo}</p>}
                        {message.anexos.length > 0 && <div className="attachment-list">{message.anexos.map((attachment) => <a key={attachment.id} href={attachmentUrl(attachment.id)} target="_blank" rel="noreferrer">{attachment.originalFilename}<small>{Math.ceil(attachment.sizeBytes / 1024)} KB</small></a>)}</div>}
                      </article>
                    );
                  })}
                </div>
                <form className="message-composer" onSubmit={handleSend}>
                  {files.length > 0 && <div className="selected-files">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>)}</div>}
                  {messageError && messages.length > 0 && <div className="form-error" role="alert">{messageError}</div>}
                  <label htmlFor="message-draft">Mensagem</label>
                  <textarea id="message-draft" rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva apenas o que precisa ficar registrado…" />
                  <footer><label className="ghost-button">Anexar evidência<input type="file" multiple hidden onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label><button type="submit" className="primary-button" disabled={sending || (!draft.trim() && files.length === 0)}>{sending ? 'Enviando…' : 'Enviar mensagem'}</button></footer>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {showNew && <NewConversationDialog workspaceId={workspaceId} territories={territories} onClose={() => setShowNew(false)} onCreated={(conversation) => { setShowNew(false); setConversations((current) => [conversation, ...current]); setActiveId(conversation.id); }} />}
    </div>
  );
}
