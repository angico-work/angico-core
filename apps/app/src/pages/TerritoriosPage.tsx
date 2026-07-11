import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import AddressField from '../components/AddressField';
import type { AppContext } from '../components/AppShell';
import MapView from '../components/MapView';
import ModalDialog from '../components/ModalDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import { createTerritorio, listTerritorios, resolveCoords, reverseGeocode } from '../lib/api';
import type { GeoResult, Territorio, TerritorioInput } from '../types';

const TERRITORY_TYPES = [
  { value: 'BAIRRO', label: 'Bairro' },
  { value: 'COMUNIDADE', label: 'Comunidade' },
  { value: 'MICROBACIA', label: 'Microbacia' },
  { value: 'DISTRITO', label: 'Distrito' },
  { value: 'MUNICIPIO', label: 'Município' },
  { value: 'OUTRO', label: 'Outro' }
];

function locationLabel(territory: Territorio): string {
  if (!territory.bairro && !territory.cidade && !territory.estado
      && territory.latitude == null && territory.longitude == null) {
    return 'Localização não informada';
  }
  return [territory.bairro, territory.cidade, territory.estado, territory.pais]
    .filter(Boolean)
    .join(', ');
}

function NewTerritorioDialog({ workspaceId, onClose, onCreated }: {
  workspaceId: string;
  onClose: () => void;
  onCreated: (territory: Territorio) => void;
}) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('BAIRRO');
  const [locationText, setLocationText] = useState('');
  const [location, setLocation] = useState<GeoResult | null>(null);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locationRequest = useRef(0);

  async function selectLocation(result: GeoResult) {
    const request = ++locationRequest.current;
    setLocation(result);
    const resolved = await resolveCoords(result);
    if (request === locationRequest.current) setCoords(resolved);
  }

  function changeLocationText(next: string) {
    locationRequest.current += 1;
    setLocationText(next);
    if (location && next !== location.displayName) {
      setLocation(null);
      setCoords(null);
    }
  }

  async function movePin(lat: number, lng: number) {
    const request = ++locationRequest.current;
    setCoords([lat, lng]);
    setLocation((current) => current ? {
      ...current,
      latitude: lat,
      longitude: lng,
      boundingBox: []
    } : current);
    const result = await reverseGeocode(lat, lng);
    if (!result || request !== locationRequest.current) return;
    setLocation(result);
    setLocationText(result.displayName);
  }

  function clearLocation() {
    locationRequest.current += 1;
    setLocationText('');
    setLocation(null);
    setCoords(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = nome.trim();
    if (!trimmedName) {
      setError('Informe o nome do território.');
      document.getElementById('territory-name')?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    const input: TerritorioInput = {
      workspaceId,
      nome: trimmedName,
      tipo,
      cidade: location?.city ?? null,
      bairro: location?.neighborhood ?? null,
      estado: location?.state ?? null,
      pais: location?.country ?? null,
      latitude: coords?.[0] ?? null,
      longitude: coords?.[1] ?? null,
      boundingBox: location?.boundingBox?.length ? location.boundingBox : null
    };
    try {
      onCreated(await createTerritorio(input));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar o território.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog
      titleId="new-territory-title"
      descriptionId="new-territory-description"
      busy={submitting}
      onClose={onClose}
    >
      <header className="dialog-head">
        <div>
          <span className="overline">Cadastro territorial</span>
          <h2 id="new-territory-title">Novo território</h2>
          <p id="new-territory-description">Nomeie o lugar e informe a localização somente quando ela for conhecida.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose} disabled={submitting}>×</button>
      </header>
      <form onSubmit={submit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="territory-name">Nome do território</label>
            <input
              id="territory-name"
              data-autofocus
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="territory-type">Tipo</label>
            <select id="territory-type" value={tipo} onChange={(event) => setTipo(event.target.value)}>
              {TERRITORY_TYPES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="territory-location">Localização <span>opcional</span></label>
          <AddressField
            id="territory-location"
            value={locationText}
            onChange={changeLocationText}
            onSelect={(result) => void selectLocation(result)}
            placeholder="Busque um bairro, comunidade ou município"
          />
          <small>Somente uma opção selecionada na busca será vinculada ao território.</small>
        </div>
        {coords ? (
          <div className="capture-map">
            <MapView
              center={coords}
              zoom={15}
              height={220}
              recenter
              picker={{ position: coords, onPick: movePin }}
            />
            <p>O marcador corresponde às coordenadas que serão salvas.</p>
          </div>
        ) : (
          <div className="location-empty" role="status">
            <b>Localização não informada</b>
            <span>Latitude, longitude e limites serão enviados como nulos.</span>
          </div>
        )}
        {location && (
          <button type="button" className="danger-text-button" onClick={clearLocation}>Remover localização</button>
        )}
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className="dialog-actions">
          <button type="button" className="ghost-button" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar território'}</button>
        </footer>
      </form>
    </ModalDialog>
  );
}

export default function TerritoriosPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [territories, setTerritories] = useState<Territorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const refreshRequest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current;
    setTerritories([]);
    setLoading(true);
    setError(null);
    try {
      const response = await listTerritorios(workspaceId);
      if (request === refreshRequest.current) setTerritories(response);
    } catch (caught) {
      if (request === refreshRequest.current) {
        setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os territórios.');
      }
    } finally {
      if (request === refreshRequest.current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="page territories-page">
      <header className="page-head">
        <div>
          <span className="overline">Lugares acompanhados</span>
          <h1>Territórios</h1>
          <p>Cadastre os lugares reais deste espaço de trabalho sem preencher localização por suposição.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setCreating(true)}>Novo território</button>
      </header>

      {loading && <LoadingState label="Carregando territórios…" />}
      {error && <ErrorState message={error} onRetry={() => void refresh()} />}
      {!loading && !error && territories.length === 0 && (
        <EmptyState
          title="Nenhum território cadastrado"
          message="Cadastre o primeiro lugar acompanhado neste espaço de trabalho."
          action={<button className="secondary-button" type="button" onClick={() => setCreating(true)}>Novo território</button>}
        />
      )}
      {!loading && territories.length > 0 && (
        <section className="record-sheet" aria-label="Territórios cadastrados">
          <header className="record-sheet-head"><span>{territories.length} {territories.length === 1 ? 'território' : 'territórios'}</span><span>Por nome</span></header>
          <div className="record-list">
            {territories.map((territory) => (
              <article className="record-row territory-row" key={territory.id} style={{ '--record-accent': '#0E7C86' } as React.CSSProperties}>
                <span className="record-mark" aria-hidden="true" />
                <div className="record-main">
                  <h2>{territory.nome}</h2>
                  <div className="record-meta"><span>{TERRITORY_TYPES.find((entry) => entry.value === territory.tipo)?.label ?? territory.tipo ?? 'Tipo não informado'}</span><span>{locationLabel(territory)}</span></div>
                </div>
                <div className="record-provenance">
                  <strong>{territory.status ?? 'Status não informado'}</strong>
                  {territory.updatedAt && <time dateTime={territory.updatedAt}>Atualizado em {new Date(territory.updatedAt).toLocaleDateString('pt-BR')}</time>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {creating && (
        <NewTerritorioDialog
          workspaceId={workspaceId}
          onClose={() => setCreating(false)}
          onCreated={(territory) => {
            setTerritories((current) => [...current, territory].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}
