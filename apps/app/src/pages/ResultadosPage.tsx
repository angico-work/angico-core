import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import ModalDialog from '../components/ModalDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import { listAcoes, listResultados } from '../lib/api';
import { captureDomainMutation, type CaptureDomainMutationResult } from '../lib/offlineSync';
import { mutationNotice } from '../lib/mutationFeedback';
import type { Acao, Resultado } from '../types';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function ResultDialog({ workspaceId, actions, requestedActionId, onClose, onSubmitted }: {
  workspaceId: string;
  actions: Acao[];
  requestedActionId: string | null;
  onClose: () => void;
  onSubmitted: (result: CaptureDomainMutationResult) => void;
}) {
  const requested = Number(requestedActionId);
  const [actionId, setActionId] = useState(requestedActionId !== null
    ? (actions.some((action) => action.id === requested) ? requested : 0)
    : actions[0]?.id ?? 0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionId) {
      setError('Cadastre ou selecione uma ação antes de continuar.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      onSubmitted(await captureDomainMutation('RESULTADO_CREATE', {
        workspaceId,
        acaoId: actionId,
        titulo: title.trim(),
        descricao: description.trim() || undefined,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar o resultado.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog titleId="new-result-title" descriptionId="new-result-description" busy={submitting} onClose={onClose}>
      <header className="dialog-head">
        <div><span className="overline">Mudança observada</span><h2 id="new-result-title">Novo resultado</h2><p id="new-result-description">Escolha a ação pelo nome e descreva o que de fato aconteceu.</p></div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose} disabled={submitting}>×</button>
      </header>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="result-action">Ação relacionada</label>
          <select id="result-action" value={actionId || ''} onChange={(event) => setActionId(Number(event.target.value))} required>
            <option value="">Selecione por nome</option>
            {actions.map((action) => <option key={action.id} value={action.id}>{action.titulo}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="result-title">Título</label>
          <input id="result-title" data-autofocus value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="result-description">Descrição <span>opcional</span></label>
          <textarea id="result-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} />
        </div>
        <div className="field">
          <label htmlFor="result-occurred-at">Quando aconteceu <span>opcional</span></label>
          <input id="result-occurred-at" type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className="dialog-actions">
          <button className="ghost-button" type="button" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar resultado'}</button>
        </footer>
      </form>
    </ModalDialog>
  );
}

export default function ResultadosPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<Resultado[]>([]);
  const [actions, setActions] = useState<Acao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const request = useRef(0);
  const activeWorkspace = useRef(workspaceId);

  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const [nextResults, nextActions] = await Promise.all([listResultados(workspaceId), listAcoes(workspaceId)]);
      if (request.current !== current) return;
      setResults(nextResults);
      setActions(nextActions);
    } catch (caught) {
      if (request.current === current) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os resultados.');
    } finally {
      if (request.current === current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    activeWorkspace.current = workspaceId;
    setNotice(null);
  }, [workspaceId]);

  const actionNames = useMemo(() => new Map(actions.map((action) => [action.id, action.titulo])), [actions]);
  const creating = searchParams.get('create') === '1';
  const closeDialog = () => setSearchParams({}, { replace: true });
  const openDialog = () => {
    setNotice(null);
    setSearchParams({ create: '1' });
  };
  const submitted = (submittedWorkspace: string, result: CaptureDomainMutationResult) => {
    if (activeWorkspace.current !== submittedWorkspace) return;
    closeDialog();
    setNotice(mutationNotice(result.status));
    if (result.status === 'SYNCED') void refresh();
  };

  return (
    <div className="page operational-page">
      <header className="page-head">
        <div><span className="overline">Mudanças alcançadas</span><h1>Resultados</h1><p>Registre mudanças observadas e mantenha cada uma ligada à ação que a produziu.</p></div>
        <button className="primary-button" type="button" onClick={openDialog}>Novo resultado</button>
      </header>

      {notice && <div className="inline-status" role="status">{notice}</div>}

      {loading && <LoadingState label="Carregando resultados…" />}
      {error && <ErrorState message={error} onRetry={() => void refresh()} />}
      {!loading && !error && results.length === 0 && <EmptyState title="Nenhum resultado registrado" message="Registre a primeira mudança observada a partir de uma ação real." action={<button className="secondary-button" type="button" onClick={openDialog}>Novo resultado</button>} />}
      {!loading && !error && results.length > 0 && (
        <section className="record-sheet" aria-label="Resultados registrados">
          <header className="record-sheet-head"><span>{results.length} {results.length === 1 ? 'resultado' : 'resultados'}</span><span>Registros disponíveis</span></header>
          <div className="record-list">
            {results.map((result) => (
              <article className="record-row operational-row" key={result.id} style={{ '--record-accent': '#34ABA6' } as React.CSSProperties}>
                <span className="record-mark" aria-hidden="true" />
                <div className="record-main"><h2>{result.titulo}</h2><p>{result.descricao || 'Sem descrição adicional.'}</p><div className="record-meta"><span>Ação · {actionNames.get(result.acaoId) ?? 'Ação não disponível'}</span><span>Ocorrido em {formatDate(result.occurredAt)}</span></div></div>
                <div className="record-provenance"><strong>{result.status}</strong><time dateTime={result.createdAt}>Registrado em {formatDate(result.createdAt)}</time></div>
              </article>
            ))}
          </div>
        </section>
      )}

      {creating && !loading && !error && (
        <ResultDialog
          workspaceId={workspaceId}
          actions={actions}
          requestedActionId={searchParams.get('acaoId')}
          onClose={closeDialog}
          onSubmitted={(result) => submitted(workspaceId, result)}
        />
      )}
    </div>
  );
}
