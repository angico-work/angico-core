import { useCallback, useEffect, useState } from 'react';
import { listOutbox, type OutboxEntry, type OutboxStatus } from '../lib/offlineStore';
import { syncPendingObservations } from '../lib/offlineSync';

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
  ACTION_REQUIRED: { label: 'Correção necessária', detail: 'O servidor recusou algum dado deste registro.', tone: 'attention' }
};

function when(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function SyncCenter({ ownerId, workspaceId, online, onClose }: Props) {
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ownerId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setEntries((await listOutbox(ownerId, workspaceId)).reverse());
    setLoading(false);
  }, [ownerId, workspaceId]);

  useEffect(() => {
    void refresh();
    window.addEventListener('angico:sync-state', refresh);
    return () => window.removeEventListener('angico:sync-state', refresh);
  }, [refresh]);

  async function synchronize() {
    if (!ownerId || !online) return;
    setSyncing(true);
    setError(null);
    try {
      await syncPendingObservations({ ownerId, workspaceId });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível iniciar a sincronização.');
    } finally {
      setSyncing(false);
    }
  }

  const pending = entries.filter((entry) => entry.status !== 'SYNCED').length;

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="sync-dialog" role="dialog" aria-modal="true" aria-labelledby="sync-title">
        <header className="dialog-head">
          <div>
            <span className="overline">Dados deste aparelho</span>
            <h2 id="sync-title">Sincronização</h2>
            <p>{online ? 'Conexão disponível' : 'Sem conexão'} · {pending} aguardando atenção</p>
          </div>
          <button type="button" className="icon-button" aria-label="Fechar sincronização" onClick={onClose}>×</button>
        </header>

        <div className={`connection-strip ${online ? 'online' : 'offline'}`}>
          <span aria-hidden="true" />
          <div>
            <b>{online ? 'Este aparelho está conectado' : 'Trabalho offline ativo'}</b>
            <p>{online ? 'Registros pendentes podem ser enviados agora.' : 'Novos registros continuam salvos localmente.'}</p>
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="sync-list" aria-busy={loading}>
          {!loading && entries.length === 0 && (
            <div className="empty-state compact">
              <b>Nenhum registro aguardando envio.</b>
              <p>Os próximos registros de campo aparecerão aqui.</p>
            </div>
          )}
          {entries.map((entry) => {
            const status = STATUS[entry.status];
            return (
              <article className="sync-entry" key={entry.id}>
                <div className="sync-entry-copy">
                  <span className={`status-dot ${status.tone}`} aria-hidden="true" />
                  <div>
                    <b>{entry.body.titulo}</b>
                    <p>{entry.body.localizacao || entry.body.categoria}</p>
                    {entry.lastError && <small>{entry.lastError}</small>}
                  </div>
                </div>
                <div className="sync-entry-state">
                  <strong className={status.tone}>{status.label}</strong>
                  <span>{status.detail}</span>
                  <time dateTime={entry.updatedAt}>{when(entry.updatedAt)}</time>
                </div>
              </article>
            );
          })}
        </div>

        <footer className="dialog-actions">
          <button type="button" className="ghost-button" onClick={onClose}>Fechar</button>
          <button
            type="button"
            className="primary-button"
            disabled={!ownerId || !online || syncing || pending === 0}
            onClick={synchronize}
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
          </button>
        </footer>
      </section>
    </div>
  );
}
