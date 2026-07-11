import { useEffect, useRef, useState, type FormEvent } from 'react';
import { icon } from '../lib/icons';
import WorkspaceMembersModal from './WorkspaceMembersModal';
import { DEFAULT_WORKSPACE } from '../lib/api';
import type { Workspace } from '../types';

interface Props {
  workspaces: Workspace[];
  activeSlug: string;
  onSwitch: (slug: string) => void;
  onCreate: (nome: string) => Promise<void>;
  onDelete: (slug: string) => Promise<void>;
}

export default function WorkspaceSwitcher({ workspaces, activeSlug, onSwitch, onCreate, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSlug, setConfirmingSlug] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const active = workspaces.find((w) => w.slug === activeSlug);
  const activeName = active?.nome ?? activeSlug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  function close() {
    setOpen(false);
    setCreating(false);
    setNome('');
    setError(null);
    setConfirmingSlug(null);
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(slug: string) {
    if (slug !== activeSlug) onSwitch(slug);
    close();
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(trimmed);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar o espaço de trabalho');
    } finally {
      setBusy(false);
    }
  }

  async function remove(slug: string) {
    setBusy(true);
    setError(null);
    try {
      await onDelete(slug);
      setConfirmingSlug(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover o espaço de trabalho');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="workspace-trigger"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="workspace-trigger-label">
          <span>Espaço de trabalho</span>
          <strong>{activeName}</strong>
        </div>
        <b className={`workspace-chev ${open ? 'up' : ''}`} aria-hidden="true">⌄</b>
      </button>

      {open && (
        <div className="workspace-menu" aria-label="Espaços de trabalho disponíveis">
          <div className="workspace-options">
            {workspaces.map((w) => {
              const isActive = w.slug === activeSlug;
              const removable = !isActive && w.slug !== DEFAULT_WORKSPACE;

              if (confirmingSlug === w.slug) {
                return (
                  <div className="workspace-row confirming" key={w.slug}>
                    <span className="workspace-confirm-label">Remover “{w.nome}”?</span>
                    <div className="workspace-confirm">
                      <button type="button" className="ws-confirm-yes" onClick={() => remove(w.slug)} disabled={busy}>
                        {busy ? '…' : 'Sim'}
                      </button>
                      <button type="button" className="ws-confirm-no" onClick={() => setConfirmingSlug(null)} disabled={busy}>
                        Não
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="workspace-row" key={w.slug}>
                  <button
                    type="button"
                    aria-current={isActive ? 'true' : undefined}
                    className={`workspace-option ${isActive ? 'active' : ''}`}
                    onClick={() => pick(w.slug)}
                  >
                    <span className="workspace-option-name">{w.nome}</span>
                    {isActive && <span className="workspace-check">{icon('check')}</span>}
                  </button>
                  {removable && (
                    <button
                      type="button"
                      className="workspace-remove"
                      title="Remover espaço de trabalho"
                      aria-label={`Remover ${w.nome}`}
                      onClick={() => { setConfirmingSlug(w.slug); setError(null); }}
                    >
                      {icon('trash')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {error && <div className="workspace-error workspace-menu-error">{error}</div>}

          {creating ? (
            <form className="workspace-create" onSubmit={submitCreate}>
              <input
                autoFocus
                value={nome}
                placeholder="Nome do espaço de trabalho"
                maxLength={60}
                onChange={(e) => setNome(e.target.value)}
                disabled={busy}
              />
              <div className="workspace-create-actions">
                <button
                  type="button"
                  className="ws-ghost"
                  onClick={() => { setCreating(false); setNome(''); setError(null); }}
                  disabled={busy}
                >
                  Cancelar
                </button>
                <button type="submit" className="ws-primary" disabled={busy || !nome.trim()}>
                  {busy ? 'Criando…' : 'Criar'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <button type="button" className="workspace-new workspace-members-btn" onClick={() => { setShowMembers(true); close(); }}>
                {icon('people')} Membros
              </button>
              <button type="button" className="workspace-new" onClick={() => { setCreating(true); setError(null); }}>
                <span className="ws-plus" aria-hidden="true">＋</span> Novo espaço
              </button>
            </>
          )}
        </div>
      )}
      {showMembers && (
        <WorkspaceMembersModal
          slug={activeSlug}
          workspaceName={activeName}
          returnFocusRef={triggerRef}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}
