import { useState, type CSSProperties, type FormEvent } from 'react';
import { createEntity, reverseGeocode, resolveCoords, getSession } from '../lib/api';
import { captureObservation } from '../lib/offlineSync';
import type { ObservacaoInput } from '../types';
import type { GeoResult } from '../types';
import AddressField from './AddressField';
import MapView from './MapView';

export type EntityType = 'observacao' | 'problema' | 'potencialidade';

const AMBIENTAIS = [
  'Resíduos', 'Água e Saneamento', 'Mobilidade', 'Áreas Verdes', 'Calor e Arborização',
  'Desmatamento', 'Queimadas', 'Biodiversidade', 'Segurança Alimentar', 'Outros'
];
const POTENCIAIS = [
  'Segurança Alimentar', 'Agricultura Urbana', 'Áreas Verdes', 'Educação Ambiental', 'Cultura e Arte',
  'Saberes Tradicionais', 'Energia Renovável', 'Reciclagem e Compostagem', 'Turismo de Base Comunitária',
  'Saúde Comunitária', 'Esporte e Lazer', 'Coletivos e Associações', 'Espaços Públicos', 'Outros'
];
const NIVEIS = ['BAIXA', 'MEDIA', 'ALTA'];

interface TypeMeta {
  label: string;
  titulo: string;
  endpoint: string;
  cor: string;
  categorias: string[];
  nivelCampo?: 'urgencia' | 'severidade';
  nivelLabel?: string;
}

const TYPES: Record<EntityType, TypeMeta> = {
  observacao: { label: 'Observação', titulo: 'Nova observação', endpoint: '/api/observacoes', cor: '#2c8fbd', categorias: AMBIENTAIS, nivelCampo: 'urgencia', nivelLabel: 'Urgência' },
  problema: { label: 'Problema', titulo: 'Novo problema', endpoint: '/api/problemas', cor: '#f97316', categorias: AMBIENTAIS, nivelCampo: 'severidade', nivelLabel: 'Severidade' },
  potencialidade: { label: 'Potencialidade', titulo: 'Nova potencialidade', endpoint: '/api/potencialidades', cor: '#2aa84a', categorias: POTENCIAIS }
};

interface Props {
  workspaceId: string;
  initialType?: EntityType;
  lockType?: boolean;
  initialLat?: number;
  initialLng?: number;
  onClose: () => void;
  onCreated: () => void;
}

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(2, 26, 36, 0.55)', backdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16
};
const card: CSSProperties = {
  background: '#fff', borderRadius: 20, padding: 'clamp(20px, 3vw, 28px)', width: 'min(560px, 100%)',
  maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 30px 70px rgba(2, 26, 36, 0.32)'
};

// Records the creator with BOTH the readable name and the Angico ID, so the
// ontology event's actor reads e.g. "Júlia Santos (@julia)".
function authorRef(): string | undefined {
  const session = getSession();
  if (!session) return undefined;
  if (session.angicoId) return `${session.nome} (@${session.angicoId})`;
  return session.nome || undefined;
}

export default function NewEntityModal({ workspaceId, initialType = 'observacao', lockType, initialLat, initialLng, onClose, onCreated }: Props) {
  const [type, setType] = useState<EntityType>(initialType);
  const meta = TYPES[type];
  const [categoria, setCategoria] = useState(meta.categorias[0]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [bairro, setBairro] = useState('');
  const [coords, setCoords] = useState<[number, number] | null>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null
  );
  const [nivel, setNivel] = useState('MEDIA');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseType(t: EntityType) {
    setType(t);
    setCategoria(TYPES[t].categorias[0]);
  }

  // A geocoding suggestion was chosen: take its coords + cidade/UF.
  async function applyResult(r: GeoResult) {
    if (r.city) setCidade(r.city);
    if (r.state) setEstado(r.state);
    setBairro(r.neighborhood ?? '');
    const resolved = await resolveCoords(r);
    if (resolved) setCoords(resolved);
  }

  // Drag/click on the preview map → update coords + reverse-geocode the address.
  async function handlePick(lat: number, lng: number) {
    setCoords([lat, lng]);
    const r = await reverseGeocode(lat, lng);
    if (r) {
      if (r.displayName) setLocalizacao(r.displayName);
      if (r.city) setCidade(r.city);
      if (r.state) setEstado(r.state);
      setBairro(r.neighborhood ?? '');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const body: Record<string, unknown> = {
      workspaceId,
      categoria,
      titulo,
      descricao: descricao || undefined,
      localizacao: localizacao || undefined,
      latitude: coords?.[0],
      longitude: coords?.[1],
      autorId: authorRef()
    };
    if (type === 'observacao') {
      body.bairro = bairro || undefined;
      body.cidade = cidade || undefined;
      body.estado = estado || undefined;
      body.urgencia = nivel;
    } else if (type === 'problema') {
      body.severidade = nivel;
    }
    try {
      if (type === 'observacao') {
        await captureObservation(body as unknown as ObservacaoInput);
      } else {
        await createEntity(meta.endpoint, body);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setSubmitting(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 4 }}>{meta.titulo}</h2>
        <p style={{ color: '#5b7280', marginTop: 0 }}>
          Registre o que você observou e marque o local no território.
        </p>

        {!lockType && (
          <div className="type-chooser" role="tablist" aria-label="Tipo de registro">
            {(Object.keys(TYPES) as EntityType[]).map((t) => (
              <button
                type="button"
                key={t}
                role="tab"
                aria-selected={t === type}
                className={`chip ${t === type ? 'on' : ''}`}
                onClick={() => chooseType(t)}
              >
                <span className="legend-dot" style={{ background: TYPES[t].cor }} />{TYPES[t].label}
              </button>
            ))}
          </div>
        )}

        <form className="obs-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="ne-categoria">Categoria</label>
            <select id="ne-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {meta.categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ne-titulo">Título</label>
            <input id="ne-titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Descarte irregular de lixo" />
          </div>
          <div className="field">
            <label htmlFor="ne-desc">Descrição</label>
            <input id="ne-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes da situação" />
          </div>
          <div className="field">
            <label htmlFor="ne-local">Endereço ou cidade</label>
            <AddressField
              id="ne-local"
              value={localizacao}
              onChange={setLocalizacao}
              onSelect={applyResult}
              placeholder="Ex: Avenida Boa Viagem, Recife"
            />
          </div>

          {coords && (
            <div className="obs-map">
              <div className="obs-map__frame">
                <MapView center={coords} zoom={16} height={200} recenter picker={{ position: coords, onPick: handlePick }} />
              </div>
              <p className="obs-map__hint">
                <span className="obs-map__dot" aria-hidden="true" />
                Arraste o marcador ou toque no mapa para ajustar.
                {' '}<span className="obs-map__coords">{coords[0].toFixed(5)}, {coords[1].toFixed(5)}</span>
                {(cidade || estado) && <> · {[cidade, estado].filter(Boolean).join(', ')}</>}
              </p>
            </div>
          )}

          {meta.nivelCampo && (
            <div className="field">
              <label htmlFor="ne-nivel">{meta.nivelLabel}</label>
              <select id="ne-nivel" value={nivel} onChange={(e) => setNivel(e.target.value)}>
                {NIVEIS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="obs-form__actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? 'Registrando…' : `Registrar ${meta.label.toLowerCase()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
