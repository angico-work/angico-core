import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import ModalDialog from '../components/ModalDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import {
  evidenciaFileUrl, listAcoes, listEvidencias, listObservacoes, listResultados, sessionOwnerId
} from '../lib/api';
import { listLocalEvidences, type LocalEvidence, type OutboxStatus } from '../lib/offlineStore';
import { captureEvidence } from '../lib/offlineSync';
import type {
  Acao, Evidencia, EvidenceSubjectType, Observacao, Resultado
} from '../types';

const SUBJECT_LABELS: Record<EvidenceSubjectType, { singular: string; plural: string }> = {
  OBSERVACAO: { singular: 'Observação', plural: 'Observações' },
  ACAO: { singular: 'Ação', plural: 'Ações' },
  RESULTADO: { singular: 'Resultado', plural: 'Resultados' }
};

interface LinkedRecord {
  id: number;
  name: string;
}

type SubjectRecords = Record<EvidenceSubjectType, LinkedRecord[]>;

function validSubjectType(value: string | null): value is EvidenceSubjectType {
  return value === 'OBSERVACAO' || value === 'ACAO' || value === 'RESULTADO';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function fileSize(value: number | null): string | null {
  if (value == null) return null;
  if (value < 1024) return `${value} bytes`;
  return `${(value / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`;
}

function authorLabel(actorId: string): string {
  if (actorId === 'api') return 'Serviço Angico';
  if (actorId === 'system') return 'Sistema';
  return /^[A-Za-z][A-Za-z0-9._-]{1,63}$/.test(actorId) ? `@${actorId}` : 'registrada';
}

const LOCAL_STATUS: Record<OutboxStatus, string> = {
  QUEUED: 'Salva neste aparelho',
  SYNCING: 'Enviando',
  SYNCED: 'Compartilhada',
  RETRYABLE_ERROR: 'Envio será tentado novamente',
  CONFLICT: 'Revisão necessária',
  BLOCKED: 'Entre novamente para enviar',
  ACTION_REQUIRED: 'Revisão necessária',
  SUPERSEDED: 'Versão substituída',
  DISCARDED: 'Descartada'
};

type EvidenceView =
  | { key: string; kind: 'remote'; evidence: Evidencia }
  | { key: string; kind: 'local'; evidence: LocalEvidence };

function mergeEvidences(remote: Evidencia[], local: LocalEvidence[]): EvidenceView[] {
  const remoteMutationIds = new Set(remote.flatMap((entry) => entry.clientMutationId ? [entry.clientMutationId] : []));
  const remoteIds = new Set(remote.map((entry) => entry.id));
  const views: EvidenceView[] = remote.map((evidence) => ({
    key: `remote:${evidence.id}`,
    kind: 'remote',
    evidence
  }));

  for (const evidence of local) {
    if (evidence.syncStatus === 'DISCARDED' || evidence.syncStatus === 'SUPERSEDED') continue;
    if (remoteMutationIds.has(evidence.clientMutationId)) continue;
    if (evidence.remote) {
      if (remoteIds.has(evidence.remote.id)) continue;
      remoteIds.add(evidence.remote.id);
      if (evidence.remote.clientMutationId) remoteMutationIds.add(evidence.remote.clientMutationId);
      views.push({ key: `remote:${evidence.remote.id}`, kind: 'remote', evidence: evidence.remote });
      continue;
    }
    views.push({ key: `local:${evidence.clientMutationId}`, kind: 'local', evidence });
  }

  return views;
}

function EvidenceDialog({ workspaceId, records, requestedType, requestedId, onClose, onCreated }: {
  workspaceId: string;
  records: SubjectRecords;
  requestedType: string | null;
  requestedId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const initialType = validSubjectType(requestedType) ? requestedType : 'OBSERVACAO';
  const requestedNumber = Number(requestedId);
  const hasRequestedSubject = requestedType !== null || requestedId !== null;
  const initialRecord = hasRequestedSubject
    ? (records[initialType].some((entry) => entry.id === requestedNumber) ? requestedNumber : 0)
    : records[initialType][0]?.id ?? 0;
  const [subjectType, setSubjectType] = useState<EvidenceSubjectType>(initialType);
  const [subjectId, setSubjectId] = useState(initialRecord);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [capturedAt, setCapturedAt] = useState('');
  const [file, setFile] = useState<File | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeType(next: EvidenceSubjectType) {
    setSubjectType(next);
    setSubjectId(records[next][0]?.id ?? 0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subjectId) {
      setError(`Cadastre ou selecione ${SUBJECT_LABELS[subjectType].singular.toLocaleLowerCase('pt-BR')} antes de continuar.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await captureEvidence({
        workspaceId,
        subjectType,
        subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        capturedAt: capturedAt ? new Date(capturedAt).toISOString() : undefined,
        file
      });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar a evidência.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog titleId="new-evidence-title" descriptionId="new-evidence-description" busy={submitting} onClose={onClose}>
      <header className="dialog-head">
        <div>
          <span className="overline">Registro verificável</span>
          <h2 id="new-evidence-title">Nova evidência</h2>
          <p id="new-evidence-description">Vincule o registro pelo nome. O arquivo é opcional.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose} disabled={submitting}>×</button>
      </header>
      <form onSubmit={submit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="evidence-subject-type">Tipo de registro</label>
            <select
              id="evidence-subject-type"
              value={subjectType}
              onChange={(event) => changeType(event.target.value as EvidenceSubjectType)}
            >
              {(Object.keys(SUBJECT_LABELS) as EvidenceSubjectType[]).map((type) => (
                <option key={type} value={type}>{SUBJECT_LABELS[type].singular}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="evidence-subject">Registro vinculado</label>
            <select
              id="evidence-subject"
              value={subjectId || ''}
              onChange={(event) => setSubjectId(Number(event.target.value))}
              required
            >
              <option value="">Selecione por nome</option>
              {records[subjectType].map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="evidence-title">Título</label>
          <input id="evidence-title" data-autofocus value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="evidence-description">Descrição <span>opcional</span></label>
          <textarea id="evidence-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="evidence-captured-at">Momento da captura <span>opcional</span></label>
            <input id="evidence-captured-at" type="datetime-local" value={capturedAt} onChange={(event) => setCapturedAt(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="evidence-file">Arquivo <span>opcional, até 2 MB</span></label>
            <input
              id="evidence-file"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain"
              onChange={(event) => setFile(event.target.files?.[0])}
            />
          </div>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className="dialog-actions">
          <button className="ghost-button" type="button" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar evidência'}</button>
        </footer>
      </form>
    </ModalDialog>
  );
}

export default function EvidenciasPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [evidences, setEvidences] = useState<Evidencia[]>([]);
  const [localEvidences, setLocalEvidences] = useState<LocalEvidence[]>([]);
  const [observations, setObservations] = useState<Observacao[]>([]);
  const [actions, setActions] = useState<Acao[]>([]);
  const [results, setResults] = useState<Resultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError(null);
    setEvidences([]);
    try {
      const ownerId = sessionOwnerId();
      const [nextEvidences, nextLocalEvidences, nextObservations, nextActions, nextResults] = await Promise.all([
        listEvidencias(workspaceId),
        ownerId ? listLocalEvidences(ownerId, workspaceId) : Promise.resolve([]),
        listObservacoes(workspaceId),
        listAcoes(workspaceId),
        listResultados(workspaceId)
      ]);
      if (request.current !== current) return;
      setEvidences(nextEvidences);
      setLocalEvidences(nextLocalEvidences);
      setObservations(nextObservations);
      setActions(nextActions);
      setResults(nextResults);
    } catch (caught) {
      if (request.current === current) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as evidências.');
    } finally {
      if (request.current === current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const sync = () => { void refresh(); };
    void refresh();
    window.addEventListener('angico:sync-state', sync);
    return () => window.removeEventListener('angico:sync-state', sync);
  }, [refresh]);

  const records = useMemo<SubjectRecords>(() => ({
    OBSERVACAO: observations.map((entry) => ({ id: entry.id, name: entry.titulo })),
    ACAO: actions.map((entry) => ({ id: entry.id, name: entry.titulo })),
    RESULTADO: results.map((entry) => ({ id: entry.id, name: entry.titulo }))
  }), [actions, observations, results]);

  const names = useMemo(() => new Map(
    (Object.keys(records) as EvidenceSubjectType[]).flatMap((type) => records[type].map((entry) => [`${type}:${entry.id}`, entry.name] as const))
  ), [records]);

  const evidenceViews = useMemo(
    () => mergeEvidences(evidences, localEvidences),
    [evidences, localEvidences]
  );

  const creating = searchParams.get('create') === '1';
  const closeDialog = () => setSearchParams({}, { replace: true });

  return (
    <div className="page operational-page">
      <header className="page-head">
        <div><span className="overline">Comprovação do percurso</span><h1>Evidências</h1><p>Registre documentos e relatos ligados a uma observação, ação ou resultado existente.</p></div>
        <button className="primary-button" type="button" onClick={() => setSearchParams({ create: '1' })}>Nova evidência</button>
      </header>

      {loading && <LoadingState label="Carregando evidências…" />}
      {error && <ErrorState message={error} onRetry={() => void refresh()} />}
      {!loading && !error && evidenceViews.length === 0 && (
        <EmptyState title="Nenhuma evidência registrada" message="Registre a primeira comprovação vinculada a um item real do percurso." action={<button className="secondary-button" type="button" onClick={() => setSearchParams({ create: '1' })}>Nova evidência</button>} />
      )}
      {!loading && !error && evidenceViews.length > 0 && (
        <section className="record-sheet" aria-label="Evidências registradas">
          <header className="record-sheet-head"><span>{evidenceViews.length} {evidenceViews.length === 1 ? 'evidência' : 'evidências'}</span><span>Registros disponíveis</span></header>
          <div className="record-list">
            {evidenceViews.map((view) => {
              const evidence = view.kind === 'remote' ? view.evidence : view.evidence.data;
              const local = view.kind === 'local' ? view.evidence : undefined;
              const file = local?.data.file;
              const hasRemoteFile = view.kind === 'remote' && view.evidence.hasFile;
              return (
              <article className="record-row operational-row" key={view.key}>
                <span className="record-mark" aria-hidden="true" />
                <div className="record-main">
                  <h2>{evidence.title}</h2>
                  <p>{evidence.description || 'Sem descrição adicional.'}</p>
                  <div className="record-meta"><span>{SUBJECT_LABELS[evidence.subjectType].singular} · {names.get(`${evidence.subjectType}:${evidence.subjectId}`) ?? 'Registro vinculado não disponível'}</span><span>Capturada em {formatDate(evidence.capturedAt)}</span></div>
                </div>
                <div className="record-provenance">
                  <strong>{local ? LOCAL_STATUS[local.syncStatus] : hasRemoteFile ? 'Arquivo disponível' : 'Sem arquivo'}</strong>
                  {view.kind === 'remote' && hasRemoteFile && <a className="record-link" href={evidenciaFileUrl(view.evidence.id)} target="_blank" rel="noreferrer">Abrir arquivo</a>}
                  {view.kind === 'remote' && view.evidence.originalFilename && <span>{view.evidence.originalFilename}{view.evidence.contentType ? ` · ${view.evidence.contentType}` : ''}</span>}
                  {file && <span>{file.name}{file.type ? ` · ${file.type}` : ''}</span>}
                  {view.kind === 'remote' && fileSize(view.evidence.sizeBytes) && <span>{fileSize(view.evidence.sizeBytes)}</span>}
                  {file && fileSize(file.size) && <span>{fileSize(file.size)}</span>}
                  {view.kind === 'remote' && view.evidence.sha256 && <span className="evidence-hash">SHA-256 {view.evidence.sha256}</span>}
                  {local?.lastError && <span>{local.lastError}</span>}
                  {view.kind === 'local'
                    ? <span>{file ? 'Arquivo salvo neste aparelho' : 'Registro salvo neste aparelho'}</span>
                    : <span>Autoria: {authorLabel(view.evidence.actorId)}</span>}
                  {view.kind === 'remote' && <time dateTime={view.evidence.recordedAt}>Registrada em {formatDate(view.evidence.recordedAt)}</time>}
                </div>
              </article>
              );
            })}
          </div>
        </section>
      )}

      {creating && !loading && !error && (
        <EvidenceDialog
          workspaceId={workspaceId}
          records={records}
          requestedType={searchParams.get('subjectType')}
          requestedId={searchParams.get('subjectId')}
          onClose={closeDialog}
          onCreated={() => {
            closeDialog();
            void refresh();
          }}
        />
      )}
    </div>
  );
}
