import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { createEntity, getSession, listEntities } from '../lib/api';
import { listLocalObservations } from '../lib/offlineStore';
import AngicoIdField from '../components/AngicoIdField';
import NewEntityModal, { type EntityType } from '../components/NewEntityModal';
import RelationalEntityDialog, { type RelationalEntityType } from '../components/RelationalEntityDialog';
import ModalDialog from '../components/ModalDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import { MODULE_CONFIGS, type ModuleConfig } from './moduleConfigs';

type Item = Record<string, unknown>;
const GEO_TYPES: Record<string, EntityType> = {
  observacoes: 'observacao', problemas: 'problema', potencialidades: 'potencialidade'
};
const RELATIONAL_TYPES: Record<string, RelationalEntityType> = {
  missoes: 'missao', acoes: 'acao'
};

const SYNC_LABEL: Record<string, string> = {
  QUEUED: 'Salvo neste aparelho', SYNCING: 'Enviando', RETRYABLE_ERROR: 'Aguardando conexão',
  CONFLICT: 'Conflito', BLOCKED: 'Sessão necessária', ACTION_REQUIRED: 'Correção necessária', SYNCED: 'Compartilhado'
};

function GenericCreateDialog({ config, workspaceId, onClose, onCreated }: {
  config: ModuleConfig; workspaceId: string; onClose: () => void; onCreated: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(
    config.fields.map((field) => [field.name, field.type === 'select' ? field.options?.[0] ?? '' : ''])
  ));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const body: Record<string, unknown> = { workspaceId };
    config.fields.forEach((field) => { if (values[field.name]?.trim()) body[field.name] = values[field.name].trim(); });
    try {
      await createEntity(config.path, body);
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog titleId="generic-create-title" descriptionId="generic-create-description" busy={submitting} onClose={onClose}>
        <header className="dialog-head"><div><span className="overline">Novo registro</span><h2 id="generic-create-title">{config.newLabel}</h2></div><button className="icon-button" type="button" aria-label="Fechar" onClick={onClose}>×</button></header>
        <p id="generic-create-description" className="muted">Preencha os campos conhecidos; não inclua identificadores técnicos.</p>
        <form onSubmit={submit}>
          {config.fields.map((field, index) => (
            <div className="field" key={field.name}>
              <label htmlFor={`field-${field.name}`}>{field.label}{field.required ? ' *' : ''}</label>
              {field.type === 'angico-search' ? (
                <AngicoIdField
                  id={`field-${field.name}`}
                  workspaceId={workspaceId}
                  value={values[field.name]}
                  autoFocus={index === 0}
                  placeholder={field.placeholder}
                  onChange={(next) => setValues((current) => ({ ...current, [field.name]: next }))}
                  onPick={(person) => setValues((current) => ({ ...current, angicoId: person.angicoId ?? '', nome: person.nome, papel: person.papel ?? current.papel }))}
                />
              ) : field.type === 'textarea' ? (
                <textarea id={`field-${field.name}`} rows={4} autoFocus={index === 0} value={values[field.name]} placeholder={field.placeholder} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} />
              ) : field.type === 'select' ? (
                <select id={`field-${field.name}`} autoFocus={index === 0} value={values[field.name]} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}>
                  {field.options?.map((option) => <option key={option}>{option}</option>)}
                </select>
              ) : (
                <input id={`field-${field.name}`} autoFocus={index === 0} value={values[field.name]} placeholder={field.placeholder} required={field.required} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} />
              )}
            </div>
          ))}
          {error && <div className="form-error" role="alert">{error}</div>}
          <footer className="dialog-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar registro'}</button></footer>
        </form>
    </ModalDialog>
  );
}

function formatDate(item: Item): string | null {
  const value = item.createdAt ?? item.occurredAt;
  if (typeof value !== 'string') return null;
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ModulePage({ configKey }: { configKey: string }) {
  const { workspaceId } = useOutletContext<AppContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const config = MODULE_CONFIGS[configKey];
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const contextualCreate = searchParams.get('create') === '1';

  useEffect(() => {
    if (contextualCreate) setShowCreate(true);
  }, [contextualCreate]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    let localSnapshots: Item[] = [];
    try {
      if (configKey === 'observacoes') {
        const session = getSession();
        const ownerId = session?.angicoId || (session ? `pessoa-${session.pessoaId}` : undefined);
        const local = ownerId ? await listLocalObservations(ownerId, workspaceId) : [];
        localSnapshots = local
          .filter((record) => !['SUPERSEDED', 'DISCARDED'].includes(record.syncStatus))
          .map<Item>((record) => ({
            ...record.data,
            ...record.remote,
            localKey: record.clientMutationId,
            syncStatus: record.syncStatus
          }));
      }
      const remote = await listEntities<Item>(config.path, workspaceId);
      if (configKey !== 'observacoes') {
        setItems(remote);
      } else {
        const remoteIds = new Set(remote
          .map((item) => item.id)
          .filter((id) => id != null)
          .map(String));
        const localOnly = localSnapshots.filter((item) => (
          item.syncStatus !== 'SYNCED' || item.id == null || !remoteIds.has(String(item.id))
        ));
        setItems([...localOnly, ...remote]);
      }
    } catch (caught) {
      setItems(localSnapshots);
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os registros.');
    } finally {
      setLoading(false);
    }
  }, [config.path, configKey, workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const handleSync = () => { void refresh(); };
    window.addEventListener('angico:sync-state', handleSync);
    return () => window.removeEventListener('angico:sync-state', handleSync);
  }, [refresh]);

  function closeCreate() {
    setShowCreate(false);
    if (!contextualCreate) return;
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    next.delete('territorioId');
    next.delete('missaoId');
    setSearchParams(next, { replace: true });
  }

  function created() {
    closeCreate();
    void refresh();
  }

  return (
    <div className="page module-page">
      <header className="page-head">
        <div><span className="overline">Memória operacional</span><h1>{config.title}</h1><p>{config.subtitle}</p></div>
        <button className="primary-button" onClick={() => setShowCreate(true)}>{config.newLabel}</button>
      </header>

      {loading ? <LoadingState /> : (
        <>
          {error && <ErrorState title={items.length ? 'Mostrando dados salvos neste aparelho' : undefined} message={error} onRetry={() => void refresh()} />}
          {!error && items.length === 0 && <EmptyState title={config.emptyTitle} message={config.emptyMessage} action={<button className="secondary-button" onClick={() => setShowCreate(true)}>{config.newLabel}</button>} />}
          {items.length > 0 && <section className="record-sheet">
          <header className="record-sheet-head"><span>{items.length} {items.length === 1 ? 'registro' : 'registros'}</span><span>Mais recentes primeiro</span></header>
          <div className="record-list">
            {items.map((item, index) => {
              const badge = config.badge?.(item);
              const status = String(item.syncStatus ?? item.status ?? '');
              const date = formatDate(item);
              return (
                <article className="record-row" key={String(item.localKey ?? item.id ?? index)} style={{ '--record-accent': config.accent } as React.CSSProperties}>
                  <span className="record-mark" aria-hidden="true" />
                  <div className="record-main"><h2>{config.primary(item) || `${config.singular} sem título`}</h2><div className="record-meta">{config.meta(item).map((entry) => <span key={entry}>{entry}</span>)}</div></div>
                  <div className="record-provenance">{badge && <strong>{SYNC_LABEL[badge] ?? badge}</strong>}{status && status !== badge && <span>{SYNC_LABEL[status] ?? status}</span>}{date && <time dateTime={String(item.createdAt ?? item.occurredAt)}>{date}</time>}</div>
                </article>
              );
            })}
          </div>
          </section>}
        </>
      )}

      {showCreate && (GEO_TYPES[configKey] ? (
        <NewEntityModal
          workspaceId={workspaceId}
          initialType={GEO_TYPES[configKey]}
          initialTerritorioId={searchParams.get('territorioId') ?? undefined}
          lockType
          onClose={closeCreate}
          onCreated={created}
        />
      ) : RELATIONAL_TYPES[configKey] ? (
        <RelationalEntityDialog
          type={RELATIONAL_TYPES[configKey]}
          workspaceId={workspaceId}
          initialMissaoId={searchParams.get('missaoId') ?? undefined}
          onClose={closeCreate}
          onCreated={created}
        />
      ) : (
        <GenericCreateDialog config={config} workspaceId={workspaceId} onClose={closeCreate} onCreated={created} />
      ))}
    </div>
  );
}
