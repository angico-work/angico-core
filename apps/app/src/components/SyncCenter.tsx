import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  discardOutboxEntry,
  getSyncMetadata,
  listOutbox,
  recoverMessageAsDraft,
  reviseObservation,
  type EvidenceOutboxEntry,
  type MessageOutboxEntry,
  type ObservationOutboxEntry,
  type OutboxEntry,
  type OutboxStatus,
  type SyncMetadata
} from '../lib/offlineStore';
import { retryPendingOperations, syncPendingObservations } from '../lib/offlineSync';

interface Props {
  ownerId?: string;
  workspaceId: string;
  online: boolean;
  onClose: () => void;
}

const STATUS: Record<OutboxStatus, { label: string; detail: string; tone: string }> = {
  QUEUED: { label: 'Aguardando envio', detail: 'Salvo neste aparelho.', tone: 'pending' },
  SYNCING: { label: 'Enviando', detail: 'Transferência em andamento.', tone: 'active' },
  SYNCED: { label: 'Compartilhado', detail: 'Já está na memória do território.', tone: 'ok' },
  RETRYABLE_ERROR: { label: 'Tentará novamente', detail: 'O registro continua protegido neste aparelho.', tone: 'pending' },
  CONFLICT: { label: 'Conflito', detail: 'Precisa de revisão antes de seguir.', tone: 'attention' },
  BLOCKED: { label: 'Sessão encerrada', detail: 'Entre novamente para continuar o envio.', tone: 'attention' },
  ACTION_REQUIRED: { label: 'Correção necessária', detail: 'O servidor recusou algum dado deste registro.', tone: 'attention' },
  SUPERSEDED: { label: 'Versão revisada', detail: 'Uma nova cópia substituiu este envio.', tone: 'muted' },
  DISCARDED: { label: 'Descartado', detail: 'O envio foi interrompido por decisão da pessoa.', tone: 'muted' }
};

const SENDABLE: OutboxStatus[] = ['QUEUED', 'RETRYABLE_ERROR', 'BLOCKED'];
const REVIEWABLE: OutboxStatus[] = ['CONFLICT', 'ACTION_REQUIRED'];

function when(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function isObservationEntry(entry: OutboxEntry): entry is ObservationOutboxEntry {
  return entry.operation === 'CREATE_OBSERVATION';
}

function isMessageEntry(entry: OutboxEntry): entry is MessageOutboxEntry {
  return entry.operation === 'MESSAGE_SEND';
}

function isEvidenceEntry(entry: OutboxEntry): entry is EvidenceOutboxEntry {
  return entry.operation === 'EVIDENCE_CREATE';
}

function entryTitle(entry: OutboxEntry): string {
  if (isObservationEntry(entry)) return entry.body.titulo;
  if (isMessageEntry(entry)) {
    return entry.body.body || `Mensagem com ${entry.body.attachments.length} anexo(s)`;
  }
  return entry.body.title;
}

function entryContext(entry: OutboxEntry): string {
  if (isObservationEntry(entry)) return entry.body.localizacao || entry.body.categoria;
  if (isMessageEntry(entry)) {
    const count = entry.body.attachments.length;
    return count > 0 ? `Conversa · ${count} anexo${count === 1 ? '' : 's'}` : 'Conversa';
  }
  const labels: Record<EvidenceOutboxEntry['body']['subjectType'], string> = {
    OBSERVACAO: 'Observação',
    ACAO: 'Ação',
    RESULTADO: 'Resultado'
  };
  return `Evidência · ${labels[entry.body.subjectType]}`;
}

interface RevisionDraft {
  titulo: string;
  categoria: string;
  descricao: string;
  localizacao: string;
}

export default function SyncCenter({ ownerId, workspaceId, online, onClose }: Props) {
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [metadata, setMetadata] = useState<SyncMetadata>();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [workingId, setWorkingId] = useState<string>();
  const [reviewingId, setReviewingId] = useState<string>();
  const [revision, setRevision] = useState<RevisionDraft>();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const refreshRequest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current;
    if (!ownerId) {
      setEntries([]);
      setMetadata(undefined);
      setLoading(false);
      return;
    }
    const [nextEntries, nextMetadata] = await Promise.all([
      listOutbox(ownerId, workspaceId),
      getSyncMetadata(ownerId, workspaceId)
    ]);
    if (request !== refreshRequest.current) return;
    setEntries(nextEntries.reverse());
    setMetadata(nextMetadata);
    setLoading(false);
  }, [ownerId, workspaceId]);

  useEffect(() => {
    void refresh();
    window.addEventListener('angico:sync-state', refresh);
    return () => {
      refreshRequest.current += 1;
      window.removeEventListener('angico:sync-state', refresh);
    };
  }, [refresh]);

  async function synchronize() {
    if (!ownerId || !online) return;
    setSyncing(true);
    setError(null);
    try {
      await retryPendingOperations(ownerId, workspaceId);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível iniciar a sincronização.');
    } finally {
      setSyncing(false);
    }
  }

  function openReview(entry: ObservationOutboxEntry) {
    setReviewingId(entry.id);
    setRevision({
      titulo: entry.body.titulo,
      categoria: entry.body.categoria,
      descricao: entry.body.descricao ?? '',
      localizacao: entry.body.localizacao ?? ''
    });
    setError(null);
  }

  async function saveRevision(event: FormEvent) {
    event.preventDefault();
    if (!ownerId || !reviewingId || !revision) return;
    setWorkingId(reviewingId);
    setError(null);
    try {
      const revised = await reviseObservation(reviewingId, ownerId, workspaceId, {
        titulo: revision.titulo,
        categoria: revision.categoria,
        descricao: revision.descricao.trim() || undefined,
        localizacao: revision.localizacao.trim() || undefined
      });
      setReviewingId(undefined);
      setRevision(undefined);
      if (online) {
        await syncPendingObservations({ ownerId, workspaceId, entryId: revised.clientMutationId });
      }
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar a revisão.');
    } finally {
      setWorkingId(undefined);
    }
  }

  async function discard(entry: OutboxEntry) {
    if (!ownerId) return;
    const confirmed = window.confirm(
      entry.operation === 'MESSAGE_SEND'
        ? 'Descartar remove os anexos locais desta mensagem e interrompe o envio. Deseja continuar?'
        : entry.operation === 'EVIDENCE_CREATE' && entry.body.file
          ? 'Descartar remove o arquivo local desta evidência e interrompe o envio. O histórico manterá apenas os metadados do descarte. Deseja continuar?'
        : 'Descartar interrompe este envio. A cópia original continuará no histórico local como descartada. Deseja continuar?'
    );
    if (!confirmed) return;
    setWorkingId(entry.id);
    setError(null);
    try {
      await discardOutboxEntry(entry.id, ownerId, workspaceId);
      setReviewingId(undefined);
      setRevision(undefined);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível descartar o registro.');
    } finally {
      setWorkingId(undefined);
    }
  }

  async function recoverMessage(entry: MessageOutboxEntry) {
    if (!ownerId) return;
    setWorkingId(entry.id);
    setError(null);
    setNotice(null);
    try {
      await recoverMessageAsDraft(entry.id, ownerId, workspaceId);
      setNotice('Mensagem retomada como rascunho. Abra a conversa para revisar e enviar uma nova cópia.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível recuperar a mensagem.');
    } finally {
      setWorkingId(undefined);
    }
  }

  const sendable = entries.filter((entry) => SENDABLE.includes(entry.status)).length;
  const reviewable = entries.filter((entry) => REVIEWABLE.includes(entry.status)).length;

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="sync-dialog" role="dialog" aria-modal="true" aria-labelledby="sync-title">
        <header className="dialog-head">
          <div>
            <span className="overline">Dados deste aparelho</span>
            <h2 id="sync-title">Sincronização</h2>
            <p>{sendable} aguardando envio · {reviewable} para revisar</p>
          </div>
          <button type="button" className="icon-button" aria-label="Fechar sincronização" onClick={onClose}>×</button>
        </header>

        <div className={`connection-strip ${online ? 'online' : 'offline'}`}>
          <span aria-hidden="true" />
          <div>
            <b>{online ? 'Este aparelho está conectado' : 'Trabalho offline ativo'}</b>
            <p>Dados locais de @{ownerId ?? 'pessoa não identificada'} neste território.</p>
            <p>
              {metadata?.lastSuccessAt
                ? `Último envio concluído: ${when(metadata.lastSuccessAt)}.`
                : 'Nenhum envio concluído neste território.'}
              {metadata?.lastAttemptAt && metadata.lastAttemptAt !== metadata.lastSuccessAt
                ? ` Última tentativa: ${when(metadata.lastAttemptAt)}.`
                : ''}
            </p>
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        {notice && <div className="sync-notice" role="status">{notice}</div>}
        <div className="sync-list" aria-busy={loading}>
          {!loading && entries.length === 0 && (
            <div className="empty-state compact">
              <b>Nenhum registro aguardando envio.</b>
              <p>Os próximos registros de campo aparecerão aqui.</p>
            </div>
          )}
          {entries.map((entry) => {
            const status = STATUS[entry.status];
            const isReviewing = reviewingId === entry.id && revision;
            return (
              <article className={`sync-entry ${isReviewing ? 'reviewing' : ''}`} key={entry.id}>
                <div className="sync-entry-summary">
                  <div className="sync-entry-copy">
                    <span className={`status-dot ${status.tone}`} aria-hidden="true" />
                    <div>
                      <b>{entryTitle(entry)}</b>
                      <p>{entryContext(entry)}</p>
                      {isEvidenceEntry(entry) && entry.body.file && (
                        <>
                          <small>{entry.body.file.name}{entry.body.file.type ? ` · ${entry.body.file.type}` : ''}</small>
                          <small>O arquivo permanece salvo neste aparelho até a confirmação do envio.</small>
                        </>
                      )}
                      {entry.lastError && <small>{entry.lastError}</small>}
                    </div>
                  </div>
                  <div className="sync-entry-state">
                    <strong className={status.tone}>{status.label}</strong>
                    <span>{status.detail}</span>
                    <time dateTime={entry.updatedAt}>{when(entry.updatedAt)}</time>
                    {isObservationEntry(entry) && REVIEWABLE.includes(entry.status) && !isReviewing && (
                      <button
                        type="button"
                        className="secondary-button compact-button"
                        aria-label={`Revisar ${entry.body.titulo}`}
                        onClick={() => openReview(entry)}
                      >
                        Revisar
                      </button>
                    )}
                    {isMessageEntry(entry) && REVIEWABLE.includes(entry.status) && (
                      <div className="sync-message-actions">
                        <button
                          type="button"
                          className="secondary-button compact-button"
                          aria-label={`Retomar como rascunho: ${entryTitle(entry)}`}
                          disabled={workingId === entry.id}
                          onClick={() => void recoverMessage(entry)}
                        >
                          Retomar rascunho
                        </button>
                        <button
                          type="button"
                          className="danger-text-button compact-button"
                          aria-label={`Descartar mensagem: ${entryTitle(entry)}`}
                          disabled={workingId === entry.id}
                          onClick={() => void discard(entry)}
                        >
                          Descartar
                        </button>
                      </div>
                    )}
                    {isEvidenceEntry(entry) && REVIEWABLE.includes(entry.status) && (
                      <button
                        type="button"
                        className="danger-text-button compact-button"
                        aria-label={`Descartar evidência: ${entryTitle(entry)}`}
                        disabled={workingId === entry.id}
                        onClick={() => void discard(entry)}
                      >
                        Descartar
                      </button>
                    )}
                  </div>
                </div>
                {isObservationEntry(entry) && isReviewing && (
                  <form className="sync-review-form" onSubmit={saveRevision}>
                    <p>Uma nova versão será criada. O conteúdo original continuará no histórico local.</p>
                    <div className="field-row">
                      <div className="field">
                        <label htmlFor={`sync-title-${entry.id}`}>Título revisado</label>
                        <input
                          id={`sync-title-${entry.id}`}
                          value={revision.titulo}
                          required
                          onChange={(event) => setRevision({ ...revision, titulo: event.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`sync-category-${entry.id}`}>Categoria revisada</label>
                        <input
                          id={`sync-category-${entry.id}`}
                          value={revision.categoria}
                          required
                          onChange={(event) => setRevision({ ...revision, categoria: event.target.value })}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`sync-description-${entry.id}`}>Descrição revisada</label>
                      <textarea
                        id={`sync-description-${entry.id}`}
                        rows={3}
                        value={revision.descricao}
                        onChange={(event) => setRevision({ ...revision, descricao: event.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`sync-location-${entry.id}`}>Local revisado</label>
                      <input
                        id={`sync-location-${entry.id}`}
                        value={revision.localizacao}
                        onChange={(event) => setRevision({ ...revision, localizacao: event.target.value })}
                      />
                    </div>
                    <div className="sync-review-actions">
                      <button type="button" className="danger-text-button" disabled={workingId === entry.id} onClick={() => void discard(entry)}>
                        Descartar registro
                      </button>
                      <button type="button" className="ghost-button" onClick={() => { setReviewingId(undefined); setRevision(undefined); }}>
                        Cancelar
                      </button>
                      <button type="submit" className="primary-button" disabled={workingId === entry.id}>
                        {workingId === entry.id ? 'Salvando…' : online ? 'Salvar correção e reenviar' : 'Salvar correção'}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>

        <footer className="dialog-actions">
          <button type="button" className="ghost-button" onClick={onClose}>Fechar</button>
          <button
            type="button"
            className="primary-button"
            disabled={!ownerId || !online || syncing || sendable === 0}
            onClick={synchronize}
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
          </button>
        </footer>
      </section>
    </div>
  );
}
