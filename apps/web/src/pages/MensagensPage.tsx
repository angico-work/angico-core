import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import {
  listConversas, listMensagens, sendMensagem, createConversa, ensureTerritorio,
  attachmentUrl, getSession
} from '../lib/api';
import type { Conversa, Mensagem } from '../types';

function NewConversaModal({ workspaceId, territorioId, onClose, onCreated }: {
  workspaceId: string; territorioId: number | null; onClose: () => void; onCreated: (c: Conversa) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [participantes, setParticipantes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (territorioId == null) {
      setError('Nenhum território disponível para ancorar a conversa.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const refs = participantes.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    try {
      const conversa = await createConversa({ workspaceId, territorioId, titulo, participanteRefs: refs });
      onCreated(conversa);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Nova conversa ou grupo</h2>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="conv-titulo">Título *</label>
            <input id="conv-titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Mutirão da Rua das Flores" />
          </div>
          <div className="field">
            <label htmlFor="conv-part">Participantes (Angico IDs)</label>
            <input id="conv-part" value={participantes} onChange={(e) => setParticipantes(e.target.value)} placeholder="@maria.silva, @joao — opcional, separados por vírgula" />
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" className="ghost-button" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Criando…' : 'Criar conversa'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function MensagensPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [territorioId, setTerritorioId] = useState<number | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const meId = getSession()?.pessoaId ?? null;

  function refreshConversas() {
    void listConversas(workspaceId).then((list) => {
      setConversas(list);
      setActiveId((cur) => cur ?? list[0]?.id ?? null);
    });
  }
  useEffect(refreshConversas, [workspaceId]);
  useEffect(() => {
    void ensureTerritorio(workspaceId).then(setTerritorioId);
  }, [workspaceId]);

  useEffect(() => {
    if (activeId == null) { setMensagens([]); return; }
    void listMensagens(activeId).then(setMensagens);
  }, [activeId]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [mensagens]);

  const active = conversas.find((c) => c.id === activeId) ?? null;

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (activeId == null || (!draft.trim() && files.length === 0)) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendMensagem(activeId, draft, files);
      setMensagens((m) => [...m, msg]);
      setDraft('');
      setFiles([]);
      refreshConversas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Mensagens e Grupos</h1>
          <p>Conversas do território — combine ações, alinhe missões e troque evidências.</p>
        </div>
        <button className="primary-button" onClick={() => setShowNew(true)}>＋ Nova conversa</button>
      </div>

      <div className="message-layout">
        <aside className="thread-list">
          {conversas.length === 0 && <div className="empty-state"><p>Nenhuma conversa ainda.</p></div>}
          {conversas.map((c) => (
            <button key={c.id} className={c.id === activeId ? 'active' : ''} onClick={() => setActiveId(c.id)}>
              <b>{c.titulo}</b>
              <span>Atualizada {fmtTime(c.updatedAt)}</span>
            </button>
          ))}
        </aside>

        <section className="chat-panel">
          {active ? (
            <>
              <div className="chat-head">
                <div>
                  <h2>{active.titulo}</h2>
                  <p>{active.status === 'ATIVA' ? 'Conversa ativa' : active.status}</p>
                </div>
              </div>
              <div className="message-stream" ref={streamRef}>
                {mensagens.length === 0 && <div className="empty-state"><p>Sem mensagens ainda. Diga olá! 👋</p></div>}
                {mensagens.map((m) => {
                  const mine = meId != null && m.senderPessoaId === meId;
                  return (
                    <div key={m.id} className={`message-bubble ${mine ? 'mine' : ''}`}>
                      {m.corpo && <p>{m.corpo}</p>}
                      {m.anexos.length > 0 && (
                        <div className="attachment-list">
                          {m.anexos.map((a) => (
                            <a key={a.id} className="attachment-pill" href={attachmentUrl(a.id)} target="_blank" rel="noreferrer">{a.originalFilename}</a>
                          ))}
                        </div>
                      )}
                      <div className="message-meta">
                        <b>{mine ? 'Você' : m.senderNome ?? 'Participante'}</b>
                        <span>{fmtTime(m.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form className="message-composer" onSubmit={handleSend}>
                {files.length > 0 && (
                  <div className="attachment-list">
                    {files.map((f, i) => <span key={i} className="attachment-pill">{f.name}</span>)}
                  </div>
                )}
                {error && <div className="form-error" role="alert">{error}</div>}
                <textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escreva uma mensagem…" />
                <div className="composer-actions">
                  <label className="button small">
                    Anexar
                    <input type="file" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                  </label>
                  <button type="submit" className="primary-button" disabled={sending}>{sending ? 'Enviando…' : 'Enviar'}</button>
                </div>
              </form>
            </>
          ) : (
            <div className="empty-state"><p>Selecione uma conversa à esquerda ou crie uma nova.</p></div>
          )}
        </section>
      </div>

      {showNew && (
        <NewConversaModal
          workspaceId={workspaceId}
          territorioId={territorioId}
          onClose={() => setShowNew(false)}
          onCreated={(c) => { setShowNew(false); setConversas((list) => [c, ...list]); setActiveId(c.id); }}
        />
      )}
    </div>
  );
}
