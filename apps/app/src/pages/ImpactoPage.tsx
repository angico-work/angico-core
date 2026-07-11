import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import ModalDialog from '../components/ModalDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import {
  createIndicador, createMedicao, listIndicadores, listMedicoes, listResultados, listTerritorios
} from '../lib/api';
import type { Indicador, Medicao, Resultado, Territorio } from '../types';

type ImpactTab = 'indicadores' | 'medicoes';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function IndicatorDialog({ workspaceId, territories, results, requestedResultId, onClose, onCreated }: {
  workspaceId: string;
  territories: Territorio[];
  results: Resultado[];
  requestedResultId: string | null;
  onClose: () => void;
  onCreated: (indicator: Indicador) => void;
}) {
  const requested = Number(requestedResultId);
  const [territoryId, setTerritoryId] = useState(territories[0]?.id ?? 0);
  const [resultId, setResultId] = useState(results.some((result) => result.id === requested) ? requested : 0);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!territoryId) {
      setError('Cadastre ou selecione um território antes de continuar.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      onCreated(await createIndicador({
        workspaceId,
        territorioId: territoryId,
        resultadoId: resultId || undefined,
        nome: name.trim(),
        unidade: unit.trim() || undefined,
        descricao: description.trim() || undefined
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar o indicador.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog titleId="new-indicator-title" descriptionId="new-indicator-description" busy={submitting} onClose={onClose}>
      <header className="dialog-head">
        <div><span className="overline">Sinal acompanhado</span><h2 id="new-indicator-title">Novo indicador</h2><p id="new-indicator-description">Defina o território e, quando existir, o resultado que motivou este indicador.</p></div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose} disabled={submitting}>×</button>
      </header>
      <form onSubmit={submit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="indicator-territory">Território</label>
            <select id="indicator-territory" value={territoryId || ''} onChange={(event) => setTerritoryId(Number(event.target.value))} required>
              <option value="">Selecione por nome</option>
              {territories.map((territory) => <option key={territory.id} value={territory.id}>{territory.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="indicator-result">Resultado relacionado <span>opcional</span></label>
            <select id="indicator-result" value={resultId || ''} onChange={(event) => setResultId(Number(event.target.value))}>
              <option value="">Sem resultado relacionado</option>
              {results.map((result) => <option key={result.id} value={result.id}>{result.titulo}</option>)}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="indicator-name">Nome do indicador</label>
            <input id="indicator-name" data-autofocus value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} />
          </div>
          <div className="field">
            <label htmlFor="indicator-unit">Unidade</label>
            <input id="indicator-unit" value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={40} placeholder="ex.: famílias, metros, encontros" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="indicator-description">Descrição <span>opcional</span></label>
          <textarea id="indicator-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className="dialog-actions"><button className="ghost-button" type="button" onClick={onClose} disabled={submitting}>Cancelar</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar indicador'}</button></footer>
      </form>
    </ModalDialog>
  );
}

function MeasurementDialog({ workspaceId, indicators, requestedIndicatorId, onClose, onCreated }: {
  workspaceId: string;
  indicators: Indicador[];
  requestedIndicatorId: string | null;
  onClose: () => void;
  onCreated: (measurement: Medicao) => void;
}) {
  const requested = Number(requestedIndicatorId);
  const initial = indicators.find((indicator) => indicator.id === requested) ?? indicators[0];
  const [indicatorId, setIndicatorId] = useState(initial?.id ?? 0);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(initial?.unidade ?? '');
  const [source, setSource] = useState('');
  const [measuredAt, setMeasuredAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeIndicator(id: number) {
    setIndicatorId(id);
    setUnit(indicators.find((indicator) => indicator.id === id)?.unidade ?? '');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericValue = Number(value);
    if (!indicatorId || !Number.isFinite(numericValue)) {
      setError('Selecione um indicador e informe um valor válido.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      onCreated(await createMedicao({
        workspaceId,
        indicadorId: indicatorId,
        valor: numericValue,
        unidade: unit.trim() || undefined,
        fonte: source.trim() || undefined,
        measuredAt: measuredAt ? new Date(measuredAt).toISOString() : undefined
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar a medição.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog titleId="new-measurement-title" descriptionId="new-measurement-description" busy={submitting} onClose={onClose}>
      <header className="dialog-head">
        <div><span className="overline">Valor observado</span><h2 id="new-measurement-title">Nova medição</h2><p id="new-measurement-description">Escolha o indicador pelo nome e registre somente um valor observado.</p></div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose} disabled={submitting}>×</button>
      </header>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="measurement-indicator">Indicador</label>
          <select id="measurement-indicator" value={indicatorId || ''} onChange={(event) => changeIndicator(Number(event.target.value))} required>
            <option value="">Selecione por nome</option>
            {indicators.map((indicator) => <option key={indicator.id} value={indicator.id}>{indicator.nome}</option>)}
          </select>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="measurement-value">Valor</label><input id="measurement-value" data-autofocus type="number" step="any" value={value} onChange={(event) => setValue(event.target.value)} required /></div>
          <div className="field"><label htmlFor="measurement-unit">Unidade</label><input id="measurement-unit" value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={40} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="measurement-source">Fonte <span>opcional</span></label><input id="measurement-source" value={source} onChange={(event) => setSource(event.target.value)} maxLength={255} /></div>
          <div className="field"><label htmlFor="measurement-at">Momento da medição <span>opcional</span></label><input id="measurement-at" type="datetime-local" value={measuredAt} onChange={(event) => setMeasuredAt(event.target.value)} /></div>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className="dialog-actions"><button className="ghost-button" type="button" onClick={onClose} disabled={submitting}>Cancelar</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar medição'}</button></footer>
      </form>
    </ModalDialog>
  );
}

export default function ImpactoPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<ImpactTab>(searchParams.get('create') === 'medicao' ? 'medicoes' : 'indicadores');
  const [indicators, setIndicators] = useState<Indicador[]>([]);
  const [measurements, setMeasurements] = useState<Medicao[]>([]);
  const [territories, setTerritories] = useState<Territorio[]>([]);
  const [results, setResults] = useState<Resultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError(null);
    setIndicators([]);
    setMeasurements([]);
    try {
      const [nextIndicators, nextMeasurements, nextTerritories, nextResults] = await Promise.all([
        listIndicadores(workspaceId), listMedicoes(workspaceId), listTerritorios(workspaceId), listResultados(workspaceId)
      ]);
      if (request.current !== current) return;
      setIndicators(nextIndicators);
      setMeasurements(nextMeasurements);
      setTerritories(nextTerritories);
      setResults(nextResults);
    } catch (caught) {
      if (request.current === current) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar indicadores e medições.');
    } finally {
      if (request.current === current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const territoryNames = useMemo(() => new Map(territories.map((territory) => [territory.id, territory.nome])), [territories]);
  const indicatorNames = useMemo(() => new Map(indicators.map((indicator) => [indicator.id, indicator.nome])), [indicators]);
  const creation = searchParams.get('create');
  const closeDialog = () => setSearchParams({}, { replace: true });
  const openCreation = (kind: 'indicador' | 'medicao') => {
    setTab(kind === 'indicador' ? 'indicadores' : 'medicoes');
    setSearchParams({ create: kind });
  };
  const visibleCount = tab === 'indicadores' ? indicators.length : measurements.length;

  return (
    <div className="page operational-page">
      <header className="page-head">
        <div><span className="overline">Acompanhamento do impacto</span><h1>Indicadores e medições</h1><p>Defina sinais do território e registre cada valor observado sem estimativas da interface.</p></div>
        <div className="page-actions"><button className="secondary-button" type="button" onClick={() => openCreation('medicao')}>Nova medição</button><button className="primary-button" type="button" onClick={() => openCreation('indicador')}>Novo indicador</button></div>
      </header>

      <div className="record-tabs" role="tablist" aria-label="Leitura de impacto">
        <button type="button" role="tab" aria-selected={tab === 'indicadores'} onClick={() => setTab('indicadores')}>Indicadores</button>
        <button type="button" role="tab" aria-selected={tab === 'medicoes'} onClick={() => setTab('medicoes')}>Medições</button>
      </div>

      {loading && <LoadingState label="Carregando indicadores e medições…" />}
      {error && <ErrorState message={error} onRetry={() => void refresh()} />}
      {!loading && !error && visibleCount === 0 && (
        <EmptyState
          title={tab === 'indicadores' ? 'Nenhum indicador cadastrado' : 'Nenhuma medição registrada'}
          message={tab === 'indicadores' ? 'Defina o primeiro sinal que será acompanhado no território.' : 'Registre o primeiro valor observado para um indicador existente.'}
          action={<button className="secondary-button" type="button" onClick={() => openCreation(tab === 'indicadores' ? 'indicador' : 'medicao')}>{tab === 'indicadores' ? 'Novo indicador' : 'Nova medição'}</button>}
        />
      )}
      {!loading && !error && tab === 'indicadores' && indicators.length > 0 && (
        <section className="record-sheet" role="tabpanel" aria-label="Indicadores cadastrados"><header className="record-sheet-head"><span>{indicators.length} {indicators.length === 1 ? 'indicador' : 'indicadores'}</span><span>Por território</span></header><div className="record-list">{indicators.map((indicator) => (
          <article className="record-row operational-row" key={indicator.id} style={{ '--record-accent': '#626B2F' } as React.CSSProperties}><span className="record-mark" aria-hidden="true" /><div className="record-main"><h2>{indicator.nome}</h2><p>{indicator.descricao || 'Sem descrição adicional.'}</p><div className="record-meta"><span>Território · {territoryNames.get(indicator.territorioId) ?? 'Território não disponível'}</span><span>Unidade · {indicator.unidade || 'Não informada'}</span></div></div><div className="record-provenance"><strong>{indicator.status}</strong><time dateTime={indicator.updatedAt}>Atualizado em {formatDate(indicator.updatedAt)}</time></div></article>
        ))}</div></section>
      )}
      {!loading && !error && tab === 'medicoes' && measurements.length > 0 && (
        <section className="record-sheet" role="tabpanel" aria-label="Medições registradas"><header className="record-sheet-head"><span>{measurements.length} {measurements.length === 1 ? 'medição' : 'medições'}</span><span>Registros disponíveis</span></header><div className="record-list">{measurements.map((measurement) => (
          <article className="record-row operational-row" key={measurement.id} style={{ '--record-accent': '#0E7C86' } as React.CSSProperties}><span className="record-mark" aria-hidden="true" /><div className="record-main"><h2>{measurement.valor.toLocaleString('pt-BR')} {measurement.unidade ?? ''}</h2><p>{measurement.fonte ? `Fonte: ${measurement.fonte}` : 'Fonte não informada.'}</p><div className="record-meta"><span>Indicador · {indicatorNames.get(measurement.indicadorId) ?? 'Indicador não disponível'}</span><span>Medido em {formatDate(measurement.measuredAt)}</span></div></div><div className="record-provenance"><strong>Valor registrado</strong><time dateTime={measurement.createdAt}>Registrado em {formatDate(measurement.createdAt)}</time></div></article>
        ))}</div></section>
      )}

      {creation === 'indicador' && !loading && !error && <IndicatorDialog workspaceId={workspaceId} territories={territories} results={results} requestedResultId={searchParams.get('resultadoId')} onClose={closeDialog} onCreated={(indicator) => { setIndicators((current) => [indicator, ...current]); setTab('indicadores'); closeDialog(); }} />}
      {creation === 'medicao' && !loading && !error && <MeasurementDialog workspaceId={workspaceId} indicators={indicators} requestedIndicatorId={searchParams.get('indicadorId')} onClose={closeDialog} onCreated={(measurement) => { setMeasurements((current) => [measurement, ...current]); setTab('medicoes'); closeDialog(); }} />}
    </div>
  );
}
