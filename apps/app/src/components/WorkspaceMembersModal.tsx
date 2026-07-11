import { useEffect, useState, type FormEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import AngicoIdField from './AngicoIdField';
import { icon } from '../lib/icons';
import { addMember, listMembers, removeMember } from '../lib/api';
import type { WorkspaceMember } from '../types';
import ModalDialog from './ModalDialog';

const ROLES = ['ADMIN', 'COORDINATOR', 'MAPPER', 'MEMBER', 'VIEWER'];
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administração', COORDINATOR: 'Coordenação', MAPPER: 'Registro de campo',
  MEMBER: 'Participante', VIEWER: 'Leitura', OWNER: 'Responsável'
};

interface Props {
  slug: string;
  workspaceName: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
}

export default function WorkspaceMembersModal({ slug, workspaceName, returnFocusRef, onClose }: Props) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorId, setActorId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    setError(null);
    void listMembers(slug).then((list) => {
      setMembers(list);
    }).catch((caught) => {
      setMembers([]);
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os integrantes.');
    }).finally(() => {
      setLoading(false);
    });
  }
  useEffect(refresh, [slug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const handle = actorId.trim().replace(/^@/, '');
    if (!handle) return;
    setBusy(true);
    setError(null);
    try {
      await addMember(slug, { actorId: handle, displayName: displayName.trim() || undefined, role });
      setActorId('');
      setDisplayName('');
      setRole('MEMBER');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar membro');
    } finally {
      setBusy(false);
    }
  }

  async function drop(member: WorkspaceMember) {
    setError(null);
    try {
      await removeMember(slug, member.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover membro');
    }
  }

  return createPortal(
    <ModalDialog
      titleId="workspace-members-title"
      descriptionId="workspace-members-description"
      busy={busy}
      returnFocusRef={returnFocusRef}
      onClose={onClose}
    >
        <header className="dialog-head">
          <div>
            <h2 id="workspace-members-title">Membros · {workspaceName}</h2>
            <p id="workspace-members-description" className="muted">Quem participa deste espaço de trabalho e seu papel.</p>
          </div>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose} disabled={busy}>×</button>
        </header>

        <div className="member-list">
          {loading ? (
            <span className="entity-meta">Carregando…</span>
          ) : members.length === 0 ? (
            <span className="entity-meta">Nenhum membro ainda. Adicione abaixo por Angico ID.</span>
          ) : (
            members.map((m) => (
              <div className="member-row" key={m.id}>
                <div className="member-id">
                  <strong>{m.displayName}</strong>
                  <span className="mono">@{m.actorId}</span>
                </div>
                <span className={`role-badge role-${m.role.toLowerCase()}`}>{ROLE_LABELS[m.role] ?? m.role}</span>
                <button type="button" className="member-remove" title="Remover membro" aria-label={`Remover ${m.displayName}`} onClick={() => drop(m)}>
                  {icon('trash')}
                </button>
              </div>
            ))
          )}
        </div>

        <form className="member-add" onSubmit={submit}>
          <div className="field">
            <label htmlFor="member-angico">Adicionar por Angico ID</label>
            <AngicoIdField
              id="member-angico"
              autoFocus
              workspaceId={slug}
              value={actorId}
              placeholder="@angicoid ou nome"
              onChange={setActorId}
              onPick={(p) => { setActorId(p.angicoId ?? ''); setDisplayName(p.nome); }}
            />
          </div>
          <div className="member-add-row">
            <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Papel do membro">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button type="submit" className="primary-button" disabled={busy || !actorId.trim()}>
              {busy ? 'Adicionando…' : 'Adicionar'}
            </button>
          </div>
          {error && <div className="member-error" role="alert">{error}</div>}
        </form>

        <div className="member-actions">
          <button type="button" className="ghost-button" onClick={onClose}>Fechar</button>
        </div>
    </ModalDialog>,
    document.body
  );
}
