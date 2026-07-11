import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import ModalDialog from '../components/ModalDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import {
  createEvidencia, evidenciaFileUrl, listAcoes, listEvidencias, listObservacoes, listResultados
} from '../lib/api';
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

function EvidenceDialog({ workspaceId, records, requestedType, requestedId, onClose, onCreated }: {
  workspaceId: string;
  records: SubjectRecords;
  requestedType: string | null;
  requestedId: string | null;
  onClose: () => void;
  onCreated: (evidence: Evidencia) => void;
}) {
  const initialType = validSubjectType(requestedType) ? requestedType : 'OBSERVACAO';
  const requestedNumber = Number(requestedId);
  const initialRecord = records[initialType].some((entry) => entry.id === requestedNumber)
    ? requestedNumber
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
      onCreated(await createEvidencia({
        workspaceId,
        subjectType,
        subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        capturedAt: capturedAt ? new Date(capturedAt).toISOString() : undefined,
        clientMutationId: crypto.randomUUID(),
        file
      }));
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
      const [nextEvidences, nextObservations, nextActions, nextResults] = await Promise.all([
        listEvidencias(workspaceId), listObservacoes(workspaceId), listAcoes(workspaceId), listResultados(workspaceId)
      ]);
      if (request.current !== current) return;
      setEvidences(nextEvidences);
      setObservations(nextObservations);
      setActions(nextActions);
      setResults(nextResults);
    } catch (caught) {
      if (request.current === current) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as evidências.');
    } finally {
      if (request.current === current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const records = useMemo<SubjectRecords>(() => ({
    OBSERVACAO: observations.map((entry) => ({ id: entry.id, name: entry.titulo })),
    ACAO: actions.map((entry) => ({ id: entry.id, name: entry.titulo })),
    RESULTADO: results.map((entry) => ({ id: entry.id, name: entry.titulo }))
  }), [actions, observations, results]);

  const names = useMemo(() => new Map(
    (Object.keys(records) as EvidenceSubjectType[]).flatMap((type) => records[type].map((entry) => [`${type}:${entry.id}`, entry.name] as const))
  ), [records]);

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
      {!loading && !error && evidences.length === 0 && (
        <EmptyState title="Nenhuma evidência registrada" message="Registre a primeira comprovação vinculada a um item real do percurso." action={<button className="secondary-button" type="button" onClick={() => setSearchParams({ create: '1' })}>Nova evidência</button>} />
      )}
      {!loading && !error && evidences.length > 0 && (
        <section className="record-sheet" aria-label="Evidências registradas">
          <header className="record-sheet-head"><span>{evidences.length} {evidences.length === 1 ? 'evidência' : 'evidências'}</span><span>Mais recentes primeiro</span></header>
          <div className="record-list">
            {evidences.map((evidence) => (
              <article className="record-row operational-row" key={evidence.id} style={{ '--record-accent': '#7A6337' } as React.CSSProperties}>
                <span className="record-mark" aria-hidden="true" />
                <div className="record-main">
                  <h2>{evidence.title}</h2>
                  <p>{evidence.description || 'Sem descrição adicional.'}</p>
                  <div className="record-meta"><span>{SUBJECT_LABELS[evidence.subjectType].singular} · {names.get(`${evidence.subjectType}:${evidence.subjectId}`) ?? 'Registro vinculado não disponível'}</span><span>Capturada em {formatDate(evidence.capturedAt)}</span></div>
                </div>
                <div className="record-provenance">
                  <strong>{evidence.hasFile ? 'Arquivo disponível' : 'Sem arquivo'}</strong>
                  {evidence.hasFile && <a className="record-link" href={evidenciaFileUrl(evidence.id)}>Abrir arquivo</a>}
                  {fileSize(evidence.sizeBytes) && <span>{fileSize(evidence.sizeBytes)}</span>}
                  <time dateTime={evidence.recordedAt}>Registrada em {formatDate(evidence.recordedAt)}</time>
                </div>
              </article>
            ))}
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
          onCreated={(evidence) => {
            setEvidences((current) => [evidence, ...current]);
            closeDialog();
          }}
        />
      )}
    </div>
  );
}
