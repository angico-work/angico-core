import { useState, type FormEvent } from 'react';
import { createConversa } from '../../lib/api';
import type { Conversa, Territorio } from '../../types';

interface NewConversationDialogProps {
  workspaceId: string;
  territories: Territorio[];
  onClose: () => void;
  onCreated: (conversation: Conversa) => void;
}

export function NewConversationDialog({
  workspaceId,
  territories,
  onClose,
  onCreated
}: NewConversationDialogProps) {
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
    const refs = participants
      .split(/[,;\s]+/)
      .map((value) => value.trim().replace(/^@/, ''))
      .filter(Boolean);
    try {
      onCreated(await createConversa({
        workspaceId,
        territorioId: territoryId,
        contextEntityType: 'TERRITORIO',
        contextEntityId: String(territoryId),
        titulo: title.trim(),
        participanteRefs: refs
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar a conversa.');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="conversation-title">
        <header className="dialog-head">
          <div><span className="overline">Coordenação no território</span><h2 id="conversation-title">Nova conversa</h2></div>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>×</button>
        </header>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="conversation-name">Assunto</label>
            <input id="conversation-name" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Organização do mutirão" />
          </div>
          <div className="field">
            <label htmlFor="conversation-territory">Território relacionado</label>
            <select id="conversation-territory" value={territoryId} onChange={(event) => setTerritoryId(Number(event.target.value))}>
              {territories.map((territory) => (
                <option key={territory.id} value={territory.id}>{territory.nome}{territory.cidade ? ` · ${territory.cidade}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="conversation-participants">Participantes <span>opcional</span></label>
            <input id="conversation-participants" value={participants} onChange={(event) => setParticipants(event.target.value)} placeholder="@maria, @cooperativa" />
            <small>Use identidades Angico separadas por vírgula.</small>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <footer className="dialog-actions">
            <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={submitting || !territoryId}>{submitting ? 'Criando…' : 'Criar conversa'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
