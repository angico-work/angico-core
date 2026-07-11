import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import { listEntities, listTerritorios, loadRastro } from '../lib/api';
import type { RastroReference, RastroResponse, RastroRootType } from '../types';

interface RootOption {
  id: string;
  nome: string;
}

interface RootRecord {
  id: number | string;
  nome?: string;
  titulo?: string;
  title?: string;
  valor?: number;
  unidade?: string | null;
}

interface RootDefinition {
  singular: string;
  plural: string;
  empty: string;
  path: string;
  resource: string;
}

const ROOTS: Record<RastroRootType, RootDefinition> = {
  TERRITORIO: { singular: 'Território', plural: 'Territórios', empty: 'Nenhum território', path: '/api/territorios', resource: 'territorios' },
  OBSERVACAO: { singular: 'Observação', plural: 'Observações', empty: 'Nenhuma observação', path: '/api/observacoes', resource: 'observacoes' },
  PROBLEMA: { singular: 'Problema', plural: 'Problemas', empty: 'Nenhum problema', path: '/api/problemas', resource: 'problemas' },
  POTENCIALIDADE: { singular: 'Potencialidade', plural: 'Potencialidades', empty: 'Nenhuma potencialidade', path: '/api/potencialidades', resource: 'potencialidades' },
  MISSAO: { singular: 'Missão', plural: 'Missões', empty: 'Nenhuma missão', path: '/api/missoes', resource: 'missoes' },
  ACAO: { singular: 'Ação', plural: 'Ações', empty: 'Nenhuma ação', path: '/api/acoes', resource: 'acoes' },
  PESSOA: { singular: 'Pessoa', plural: 'Pessoas', empty: 'Nenhuma pessoa', path: '/api/pessoas', resource: 'pessoas' },
  ORGANIZACAO: { singular: 'Organização', plural: 'Organizações', empty: 'Nenhuma organização', path: '/api/organizacoes', resource: 'organizacoes' },
  RECURSO: { singular: 'Recurso', plural: 'Recursos', empty: 'Nenhum recurso', path: '/api/recursos', resource: 'recursos' },
  EVIDENCIA: { singular: 'Evidência', plural: 'Evidências', empty: 'Nenhuma evidência', path: '/api/evidencias', resource: 'evidencias' },
  RESULTADO: { singular: 'Resultado', plural: 'Resultados', empty: 'Nenhum resultado', path: '/api/resultados', resource: 'resultados' },
  INDICADOR: { singular: 'Indicador', plural: 'Indicadores', empty: 'Nenhum indicador', path: '/api/indicadores', resource: 'indicadores' },
  MEDICAO: { singular: 'Medição', plural: 'Medições', empty: 'Nenhuma medição', path: '/api/medicoes', resource: 'medicoes' }
};

const ROOT_TYPES = Object.keys(ROOTS) as RastroRootType[];
const SAFE_REFERENCE_ID = /^[A-Za-z0-9._:-]{1,160}$/;

const RELATION_LABELS: Record<string, string> = {
  'MISSÃO_ATUA_EM_TERRITÓRIO': 'atua no território',
  MISSAO_ATUA_EM_TERRITORIO: 'atua no território',
  ACAO_EXECUTA_MISSAO: 'executa a missão',
  ACAO_PERTENCE_A_MISSAO: 'pertence à missão',
  RESPONSAVEL_POR: 'é responsável por'
};

const VALUE_LABELS: Record<string, string> = {
  TERRITORIO: 'Território',
  MISSAO: 'Missão',
  ACAO: 'Ação',
  OBSERVACAO: 'Observação',
  PROBLEMA: 'Problema',
  POTENCIALIDADE: 'Potencialidade',
  PESSOA: 'Pessoa',
  ORGANIZACAO: 'Organização',
  RECURSO: 'Recurso',
  EVIDENCIA: 'Evidência',
  RESULTADO: 'Resultado',
  INDICADOR: 'Indicador',
  MEDICAO: 'Medição',
  SERVER_RECORDED: 'Registrado no servidor',
  SYNCED_FROM_OFFLINE: 'Sincronizado após registro offline',
  SYNCED: 'Sincronizado',
  EM_ANDAMENTO: 'Em andamento'
};

function isRootType(value: string | undefined): value is RastroRootType {
  return Boolean(value && ROOT_TYPES.includes(value as RastroRootType));
}

function humanize(value: string | null | undefined): string {
  if (!value) return 'Não informado';
  if (VALUE_LABELS[value]) return VALUE_LABELS[value];
  return value
    .replaceAll('_', ' ')
    .toLocaleLowerCase('pt-BR')
    .replace(/^./, (letter) => letter.toLocaleUpperCase('pt-BR'));
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Não informado';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function referenceKey(reference: RastroReference): string {
  return `${reference.type}:${reference.id}`;
}

function rootName(record: RootRecord, type: RastroRootType): string {
  const name = [record.nome, record.titulo, record.title]
    .find((value) => typeof value === 'string' && value.trim());
  if (name) return name.trim();
  if (typeof record.valor === 'number' && Number.isFinite(record.valor)) {
    const unit = record.unidade?.trim();
    return unit ? `${record.valor} ${unit}` : String(record.valor);
  }
  return `${ROOTS[type].singular} sem título`;
}

function referencePath(reference: RastroReference): string | null {
  if (!isRootType(reference.type)) return null;
  if (reference.resource !== ROOTS[reference.type].resource) return null;
  if (!SAFE_REFERENCE_ID.test(reference.id)) return null;
  return `/app/rastro/${reference.type}/${encodeURIComponent(reference.id)}`;
}

function TraceReference({
  reference,
  emphasized = false,
  children
}: {
  reference: RastroReference;
  emphasized?: boolean;
  children: ReactNode;
}) {
  const content = emphasized ? <b>{children}</b> : children;
  const path = referencePath(reference);
  return path ? <Link to={path}>{content}</Link> : <>{content}</>;
}

function gapAction(code: string, subject: RastroReference): { label: string; to: string } | null {
  if (code === 'TERRITORIO_SEM_ORIGEM' && subject.type === 'TERRITORIO') {
    return {
      label: 'Registrar observação',
      to: `/app/observacoes?create=1&territorioId=${encodeURIComponent(subject.id)}`
    };
  }
  if (code === 'MISSAO_SEM_ACAO' && subject.type === 'MISSAO') {
    return {
      label: 'Registrar ação',
      to: `/app/acoes?create=1&missaoId=${encodeURIComponent(subject.id)}`
    };
  }
  if (code === 'ACAO_SEM_EVIDENCIA' && subject.type === 'ACAO') {
    return {
      label: 'Adicionar evidência da ação',
      to: `/app/evidencias?create=1&subjectType=ACAO&subjectId=${encodeURIComponent(subject.id)}`
    };
  }
  if (code === 'ACAO_SEM_RESULTADO' && subject.type === 'ACAO') {
    return {
      label: 'Registrar resultado',
      to: `/app/resultados?create=1&acaoId=${encodeURIComponent(subject.id)}`
    };
  }
  if (code === 'RESULTADO_SEM_EVIDENCIA' && subject.type === 'RESULTADO') {
    return {
      label: 'Adicionar evidência do resultado',
      to: `/app/evidencias?create=1&subjectType=RESULTADO&subjectId=${encodeURIComponent(subject.id)}`
    };
  }
  if (code === 'RESULTADO_SEM_INDICADOR' && subject.type === 'RESULTADO') {
    return {
      label: 'Criar indicador',
      to: `/app/indicadores?create=indicador&resultadoId=${encodeURIComponent(subject.id)}`
    };
  }
  if (code === 'INDICADOR_SEM_MEDICAO' && subject.type === 'INDICADOR') {
    return {
      label: 'Registrar medição',
      to: `/app/indicadores?create=medicao&indicadorId=${encodeURIComponent(subject.id)}`
    };
  }
  return null;
}

export default function RastroPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const params = useParams();
  const navigate = useNavigate();
  const routeType = isRootType(params.rootType) ? params.rootType : null;
  const routeId = params.rootId?.trim() || null;
  const [selectedType, setSelectedType] = useState<RastroRootType>(routeType ?? 'TERRITORIO');
  const [options, setOptions] = useState<RootOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [trace, setTrace] = useState<RastroResponse | null>(null);
  const [traceLoading, setTraceLoading] = useState(Boolean(routeType && routeId));
  const [traceError, setTraceError] = useState<string | null>(null);
  const traceRequest = useRef(0);

  useEffect(() => {
    if (routeType) setSelectedType(routeType);
  }, [routeType]);

  useEffect(() => {
    let active = true;
    setOptions([]);
    setOptionsLoading(true);
    setOptionsError(null);
    const request: Promise<RootRecord[]> = selectedType === 'TERRITORIO'
      ? listTerritorios(workspaceId)
      : listEntities<RootRecord>(ROOTS[selectedType].path, workspaceId);
    request.then((records) => {
      if (!active) return;
      setOptions(records.map((record) => ({
        id: String(record.id),
        nome: rootName(record, selectedType)
      })));
    }).catch((caught) => {
      if (active) setOptionsError(caught instanceof Error ? caught.message : 'Não foi possível carregar as raízes.');
    }).finally(() => {
      if (active) setOptionsLoading(false);
    });
    return () => { active = false; };
  }, [selectedType, workspaceId]);

  const refreshTrace = useCallback(async () => {
    const request = ++traceRequest.current;
    if (!routeType || !routeId) {
      setTrace(null);
      setTraceError(null);
      setTraceLoading(false);
      return;
    }
    setTrace(null);
    setTraceError(null);
    setTraceLoading(true);
    try {
      const response = await loadRastro(routeType, routeId, workspaceId);
      if (request === traceRequest.current) setTrace(response);
    } catch (caught) {
      if (request === traceRequest.current) {
        setTraceError(caught instanceof Error ? caught.message : 'Não foi possível carregar o Rastro.');
      }
    } finally {
      if (request === traceRequest.current) setTraceLoading(false);
    }
  }, [routeId, routeType, workspaceId]);

  useEffect(() => { void refreshTrace(); }, [refreshTrace]);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    trace?.stages.forEach((stage) => map.set(referenceKey(stage.reference), stage.name));
    trace?.participants.forEach((entry) => map.set(referenceKey(entry.participant), entry.name));
    if (trace) map.set(referenceKey(trace.root.reference), trace.root.name);
    return map;
  }, [trace]);

  const actorNames = useMemo(() => new Map(
    trace?.participants.map((participant) => [participant.participant.id, participant.name]) ?? []
  ), [trace]);

  function referenceName(reference: RastroReference): string {
    return names.get(referenceKey(reference)) ?? humanize(reference.type);
  }

  function actorName(actorId: string | null): string | null {
    if (!actorId) return null;
    const participantName = actorNames.get(actorId);
    if (participantName) return participantName;
    if (actorId === 'api') return 'Serviço Angico';
    if (actorId === 'system') return 'Sistema';
    if (/^[A-Za-z][A-Za-z0-9._-]{1,63}$/.test(actorId)) return `@${actorId}`;
    return 'registrada';
  }

  function changeType(next: RastroRootType) {
    setSelectedType(next);
    setTrace(null);
    setTraceError(null);
    navigate('/app/rastro');
  }

  function chooseRoot(id: string) {
    if (!id) return;
    navigate(`/app/rastro/${selectedType}/${encodeURIComponent(id)}`);
  }

  const invalidDeepLink = Boolean(params.rootType && !routeType);

  return (
    <div className="page rastro-page">
      <header className="page-head">
        <div>
          <span className="overline">Percurso verificável</span>
          <h1>Rastro</h1>
          <p>Consulte relações, autoria, momentos de ocorrência e lacunas sem substituir a memória histórica.</p>
        </div>
      </header>

      <section className="rastro-picker" aria-labelledby="rastro-picker-title">
        <div>
          <h2 id="rastro-picker-title">Escolha o ponto de partida</h2>
          <p>As opções pertencem ao espaço de trabalho atual.</p>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="rastro-root-type">Tipo de raiz</label>
            <select
              id="rastro-root-type"
              value={selectedType}
              onChange={(event) => changeType(event.target.value as RastroRootType)}
            >
              {ROOT_TYPES.map((type) => (
                <option key={type} value={type}>{ROOTS[type].singular}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rastro-root">Raiz do Rastro</label>
            <select
              id="rastro-root"
              value={routeType === selectedType && routeId ? routeId : ''}
              disabled={optionsLoading || Boolean(optionsError) || options.length === 0}
              onChange={(event) => chooseRoot(event.target.value)}
            >
              <option value="">Selecione por nome</option>
              {options.map((option) => <option key={option.id} value={option.id}>{option.nome}</option>)}
            </select>
          </div>
        </div>
        {optionsLoading && <div className="inline-status" role="status">Carregando {ROOTS[selectedType].plural.toLocaleLowerCase('pt-BR')}…</div>}
        {optionsError && <div className="form-error" role="alert">{optionsError}</div>}
        {!optionsLoading && !optionsError && options.length === 0 && (
          <p className="inline-empty">{ROOTS[selectedType].empty} disponível neste espaço de trabalho.</p>
        )}
      </section>

      {invalidDeepLink && <ErrorState message="O tipo de raiz informado no endereço não é aceito pelo Rastro." />}
      {traceLoading && <LoadingState label="Carregando Rastro…" />}
      {traceError && <ErrorState message={traceError} onRetry={() => void refreshTrace()} />}
      {!routeType && !routeId && !optionsLoading && !optionsError && options.length > 0 && (
        <EmptyState title="Selecione uma raiz" message="Escolha um objeto pelo nome para abrir o percurso." />
      )}

      {trace && (
        <article className="rastro-sheet">
          <header className="rastro-root">
            <div>
              <span>{ROOTS[routeType ?? 'TERRITORIO'].singular}</span>
              <h2>{trace.root.name}</h2>
              <p>{humanize(trace.root.status)} · Sincronização: {humanize(trace.root.syncStatus)}</p>
            </div>
            <div className="rastro-asof">
              <span>Dados considerados até</span>
              <time dateTime={trace.asOf}>{formatDate(trace.asOf)}</time>
            </div>
          </header>

          {trace.limits.truncated && (
            <div className="rastro-limit" role="status">
              <b>Rastro limitado</b>
              <span>A consulta atingiu o limite de segurança. Refine o ponto de partida para ver um percurso menor.</span>
            </div>
          )}

          <section className="rastro-section" aria-labelledby="rastro-stages-title">
            <header><h3 id="rastro-stages-title">Percurso</h3><span>{trace.stages.length} etapas</span></header>
            {trace.stages.length === 0 ? <p className="inline-empty">Nenhuma etapa relacionada foi encontrada.</p> : (
              <ol className="rastro-stages">
                {trace.stages.map((stage) => (
                  <li key={referenceKey(stage.reference)} data-testid="rastro-stage">
                    <span aria-hidden="true" />
                    <div><TraceReference reference={stage.reference} emphasized>{stage.name}</TraceReference><small>{humanize(stage.reference.type)} · {humanize(stage.status)}</small></div>
                    <div className="rastro-provenance"><span>Sincronização: {humanize(stage.syncStatus)}</span><span>Registrado em {formatDate(stage.recordedAt)}</span></div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rastro-section" aria-labelledby="rastro-relations-title">
            <header><h3 id="rastro-relations-title">Relações</h3><span>{trace.relations.length}</span></header>
            {trace.relations.length === 0 ? <p className="inline-empty">Nenhuma relação registrada.</p> : (
              <ul className="rastro-lines">
                {trace.relations.map((relation, index) => (
                  <li key={`${referenceKey(relation.origin)}-${referenceKey(relation.destination)}-${index}`}>
                    <TraceReference reference={relation.origin} emphasized>{referenceName(relation.origin)}</TraceReference>
                    <span>{RELATION_LABELS[relation.type] ?? humanize(relation.type).toLocaleLowerCase('pt-BR')}</span>
                    <TraceReference reference={relation.destination} emphasized>{referenceName(relation.destination)}</TraceReference>
                    <small>Registrado em {formatDate(relation.recordedAt)}{actorName(relation.actorId) ? ` · Autoria: ${actorName(relation.actorId)}` : ''}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="rastro-columns">
            <section className="rastro-section" aria-labelledby="rastro-participants-title">
              <header><h3 id="rastro-participants-title">Participantes</h3><span>{trace.participants.length}</span></header>
              {trace.participants.length === 0 ? <p className="inline-empty">Nenhuma participação registrada.</p> : (
                <ul className="rastro-lines">
                  {trace.participants.map((participant, index) => (
                    <li key={`${referenceKey(participant.participant)}-${referenceKey(participant.at)}-${participant.relationType}-${index}`}>
                      <TraceReference reference={participant.participant} emphasized>{participant.name}</TraceReference>
                      <span>{humanize(participant.relationType)} · {humanize(participant.status)}</span>
                      <small>Em <TraceReference reference={participant.at}>{referenceName(participant.at)}</TraceReference></small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rastro-section" aria-labelledby="rastro-events-title">
              <header><h3 id="rastro-events-title">Eventos</h3><span>{trace.events.length}</span></header>
              {trace.events.length === 0 ? <p className="inline-empty">Nenhum evento registrado.</p> : (
                <ol className="rastro-events">
                  {trace.events.map((event) => (
                    <li key={event.id}>
                      <b>{humanize(event.type)}</b>
                      <span>Ocorrido em {formatDate(event.occurredAt)}</span>
                      <span>Registrado em {formatDate(event.recordedAt)}</span>
                      <small>Sincronização: {humanize(event.syncStatus)}{actorName(event.actorId) ? ` · Autoria: ${actorName(event.actorId)}` : ''}</small>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section className="rastro-section rastro-gaps" aria-labelledby="rastro-gaps-title">
            <header><h3 id="rastro-gaps-title">Lacunas</h3><span>{trace.gaps.length}</span></header>
            {trace.gaps.length === 0 ? <p className="rastro-complete">Nenhuma lacuna conhecida neste percurso.</p> : (
              <ul>
                {trace.gaps.map((gap, index) => {
                  const action = gapAction(gap.code, gap.subject);
                  return (
                    <li key={`${gap.code}-${index}`}>
                      <div><b>{humanize(gap.code)}</b><p>{gap.reason}</p><span>Próximo passo: {gap.nextAction}</span></div>
                      {action && <Link className="secondary-button" to={action.to}>{action.label}</Link>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </article>
      )}
    </div>
  );
}
