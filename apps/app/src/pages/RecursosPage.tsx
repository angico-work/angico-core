import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import ModalDialog from '../components/ModalDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import {
  createRecurso, createRecursoUso, listAcoes, listRecursos, listRecursoUsos
} from '../lib/api';
import type { Acao, Recurso, RecursoCategoria, RecursoUso } from '../types';

const RESOURCE_CATEGORIES: { value: RecursoCategoria; label: string }[] = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'EQUIPAMENTO', label: 'Equipamento' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'ESPACO', label: 'Espaço' },
  { value: 'SERVICO', label: 'Serviço' },
  { value: 'OUTRO', label: 'Outro' }
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function ResourceDialog({ workspaceId, onClose, onCreated }: {
  workspaceId: string;
  onClose: () => void;
  onCreated: (resource: Recurso) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<RecursoCategoria>('MATERIAL');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onCreated(await createRecurso({
        workspaceId,
        nome: name.trim(),
        categoria: category,
        unidade: unit.trim(),
        descricao: description.trim() || undefined
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar o recurso.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog titleId="new-resource-title" descriptionId="new-resource-description" busy={submitting} onClose={onClose}>
      <header className="dialog-head">
        <div><span className="overline">Meio disponível</span><h2 id="new-resource-title">Novo recurso</h2><p id="new-resource-description">Cadastre o recurso e a unidade que será usada nos registros de uso.</p></div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose} disabled={submitting}>×</button>
      </header>
      <form onSubmit={submit}>
        <div className="field-row">
          <div className="field"><label htmlFor="resource-name">Nome do recurso</label><input id="resource-name" data-autofocus value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} /></div>
          <div className="field"><label htmlFor="resource-category">Categoria</label><select id="resource-category" value={category} onChange={(event) => setCategory(event.target.value as RecursoCategoria)}>{RESOURCE_CATEGORIES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="resource-unit">Unidade</label><input id="resource-unit" value={unit} onChange={(event) => setUnit(event.target.value)} required maxLength={40} placeholder="ex.: unidade, hora, real" /></div>
        <div className="field"><label htmlFor="resource-description">Descrição <span>opcional</span></label><textarea id="resource-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} /></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className="dialog-actions"><button className="ghost-button" type="button" onClick={onClose} disabled={submitting}>Cancelar</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar recurso'}</button></footer>
      </form>
    </ModalDialog>
  );
}

function UsageDialog({ workspaceId, resource, actions, onClose, onCreated }: {
  workspaceId: string;
  resource: Recurso;
  actions: Acao[];
  onClose: () => void;
  onCreated: (usage: RecursoUso) => void;
}) {
  const [actionId, setActionId] = useState(actions[0]?.id ?? 0);
  const [quantity, setQuantity] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericQuantity = Number(quantity);
    if (!actionId || !Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setError('Selecione uma ação e informe uma quantidade maior que zero.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      onCreated(await createRecursoUso(resource.id, {
        workspaceId,
        acaoId: actionId,
        quantidade: numericQuantity,
        unidade: resource.unidade,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar o uso.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog titleId="new-usage-title" descriptionId="new-usage-description" busy={submitting} onClose={onClose}>
      <header className="dialog-head">
        <div><span className="overline">Uso em ação</span><h2 id="new-usage-title">Registrar uso de {resource.nome}</h2><p id="new-usage-description">Escolha a ação pelo nome. A unidade segue o cadastro do recurso.</p></div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose} disabled={submitting}>×</button>
      </header>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="usage-action">Ação</label><select id="usage-action" value={actionId || ''} onChange={(event) => setActionId(Number(event.target.value))} required><option value="">Selecione por nome</option>{actions.map((action) => <option key={action.id} value={action.id}>{action.titulo}</option>)}</select></div>
        <div className="field-row">
          <div className="field"><label htmlFor="usage-quantity">Quantidade</label><input id="usage-quantity" data-autofocus type="number" min="0.0001" step="0.0001" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></div>
          <div className="field"><label htmlFor="usage-unit">Unidade</label><input id="usage-unit" value={resource.unidade} readOnly /></div>
        </div>
        <div className="field"><label htmlFor="usage-occurred-at">Quando foi usado <span>opcional</span></label><input id="usage-occurred-at" type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className="dialog-actions"><button className="ghost-button" type="button" onClick={onClose} disabled={submitting}>Cancelar</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar uso'}</button></footer>
      </form>
    </ModalDialog>
  );
}

export default function RecursosPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [resources, setResources] = useState<Recurso[]>([]);
  const [actions, setActions] = useState<Acao[]>([]);
  const [usages, setUsages] = useState<Record<number, RecursoUso[]>>({});
  const [creating, setCreating] = useState(false);
  const [usageResource, setUsageResource] = useState<Recurso | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError(null);
    setResources([]);
    setUsages({});
    try {
      const [nextResources, nextActions] = await Promise.all([listRecursos(workspaceId), listAcoes(workspaceId)]);
      const nextUsages = await Promise.all(nextResources.map(async (resource) => [
        resource.id, await listRecursoUsos(resource.id, workspaceId)
      ] as const));
      if (request.current !== current) return;
      setResources(nextResources);
      setActions(nextActions);
      setUsages(Object.fromEntries(nextUsages));
    } catch (caught) {
      if (request.current === current) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os recursos.');
    } finally {
      if (request.current === current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const actionNames = useMemo(() => new Map(actions.map((action) => [action.id, action.titulo])), [actions]);

  return (
    <div className="page operational-page">
      <header className="page-head"><div><span className="overline">Meios mobilizados</span><h1>Recursos</h1><p>Cadastre recursos disponíveis e registre os usos vinculados a ações existentes.</p></div><button className="primary-button" type="button" onClick={() => setCreating(true)}>Novo recurso</button></header>

      {loading && <LoadingState label="Carregando recursos…" />}
      {error && <ErrorState message={error} onRetry={() => void refresh()} />}
      {!loading && !error && resources.length === 0 && <EmptyState title="Nenhum recurso cadastrado" message="Cadastre o primeiro meio disponível para as ações deste espaço de trabalho." action={<button className="secondary-button" type="button" onClick={() => setCreating(true)}>Novo recurso</button>} />}
      {!loading && !error && resources.length > 0 && (
        <section className="record-sheet" aria-label="Recursos cadastrados"><header className="record-sheet-head"><span>{resources.length} {resources.length === 1 ? 'recurso' : 'recursos'}</span><span>Usos registrados</span></header><div className="record-list">{resources.map((resource) => (
          <article className="record-row operational-row" key={resource.id} style={{ '--record-accent': '#9A5B3C' } as React.CSSProperties}>
            <span className="record-mark" aria-hidden="true" />
            <div className="record-main"><h2>{resource.nome}</h2><p>{resource.descricao || 'Sem descrição adicional.'}</p><div className="record-meta"><span>{RESOURCE_CATEGORIES.find((entry) => entry.value === resource.categoria)?.label ?? resource.categoria}</span><span>Unidade · {resource.unidade}</span></div>{(usages[resource.id]?.length ?? 0) > 0 ? <ul className="record-sublist">{usages[resource.id].map((usage) => <li key={usage.id}><span>{usage.quantidade.toLocaleString('pt-BR')} {usage.unidade} · {actionNames.get(usage.acaoId) ?? 'Ação não disponível'}</span><time dateTime={usage.occurredAt}>{formatDate(usage.occurredAt)}</time></li>)}</ul> : <span className="inline-empty">Nenhum uso registrado.</span>}</div>
            <div className="record-provenance"><strong>{resource.status}</strong><button className="record-link" type="button" aria-label={`Registrar uso de ${resource.nome}`} onClick={() => setUsageResource(resource)}>Registrar uso</button><time dateTime={resource.createdAt}>Cadastrado em {formatDate(resource.createdAt)}</time></div>
          </article>
        ))}</div></section>
      )}

      {creating && <ResourceDialog workspaceId={workspaceId} onClose={() => setCreating(false)} onCreated={(resource) => { setResources((current) => [...current, resource]); setUsages((current) => ({ ...current, [resource.id]: [] })); setCreating(false); }} />}
      {usageResource && <UsageDialog workspaceId={workspaceId} resource={usageResource} actions={actions} onClose={() => setUsageResource(null)} onCreated={(usage) => { setUsages((current) => ({ ...current, [usage.recursoId]: [usage, ...(current[usage.recursoId] ?? [])] })); setUsageResource(null); }} />}
    </div>
  );
}
