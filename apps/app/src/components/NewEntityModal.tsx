import { useState, type FormEvent } from 'react';
import { createEntity, getSession, reverseGeocode, resolveCoords } from '../lib/api';
import { captureObservation, type CaptureResult } from '../lib/offlineSync';
import type { GeoResult, ObservacaoInput } from '../types';
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
const STEPS = ['Registrar', 'Ancorar', 'Comprovar e salvar'];

interface TypeMeta {
  label: string;
  title: string;
  endpoint: string;
  categories: string[];
  levelField?: 'urgencia' | 'severidade';
  levelLabel?: string;
}

const TYPES: Record<EntityType, TypeMeta> = {
  observacao: {
    label: 'Observação',
    title: 'Nova observação',
    endpoint: '/api/observacoes',
    categories: AMBIENTAIS,
    levelField: 'urgencia',
    levelLabel: 'Urgência'
  },
  problema: {
    label: 'Problema',
    title: 'Novo problema',
    endpoint: '/api/problemas',
    categories: AMBIENTAIS,
    levelField: 'severidade',
    levelLabel: 'Severidade'
  },
  potencialidade: {
    label: 'Potencialidade',
    title: 'Nova potencialidade',
    endpoint: '/api/potencialidades',
    categories: POTENCIAIS
  }
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

interface SuccessState {
  title: string;
  description: string;
  tone: 'ok' | 'pending' | 'attention';
}

function authorRef(): string | undefined {
  const session = getSession();
  if (!session) return undefined;
  return session.angicoId ? `${session.nome} (@${session.angicoId})` : session.nome || undefined;
}

function captureMessage(result: CaptureResult): SuccessState {
  if (result.status === 'SYNCED') {
    return {
      title: 'Registro sincronizado',
      description: 'A observação já entrou na memória compartilhada do território.',
      tone: 'ok'
    };
  }
  if (result.status === 'CONFLICT') {
    return {
      title: 'Salva, mas precisa de revisão',
      description: 'O registro permanece neste aparelho. Abra a sincronização para resolver o conflito.',
      tone: 'attention'
    };
  }
  if (result.status === 'ACTION_REQUIRED' || result.status === 'BLOCKED') {
    return {
      title: 'Salva neste aparelho',
      description: 'O envio precisa de atenção antes de entrar na memória compartilhada.',
      tone: 'attention'
    };
  }
  return {
    title: 'Salva neste aparelho',
    description: 'O Angico enviará esta observação quando houver conexão disponível.',
    tone: 'pending'
  };
}

export default function NewEntityModal({
  workspaceId,
  initialType = 'observacao',
  lockType,
  initialLat,
  initialLng,
  onClose,
  onCreated
}: Props) {
  const [type, setType] = useState<EntityType>(initialType);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(TYPES[initialType].categories[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [coords, setCoords] = useState<[number, number] | null>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null
  );
  const [level, setLevel] = useState('MEDIA');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const meta = TYPES[type];

  function chooseType(next: EntityType) {
    setType(next);
    setCategory(TYPES[next].categories[0]);
  }

  async function applyResult(result: GeoResult) {
    setCity(result.city ?? '');
    setState(result.state ?? '');
    setNeighborhood(result.neighborhood ?? '');
    const resolved = await resolveCoords(result);
    if (resolved) setCoords(resolved);
  }

  async function handlePick(lat: number, lng: number) {
    setCoords([lat, lng]);
    const result = await reverseGeocode(lat, lng);
    if (!result) return;
    setLocation(result.displayName || location);
    setCity(result.city ?? '');
    setState(result.state ?? '');
    setNeighborhood(result.neighborhood ?? '');
  }

  function advanceFromRecord() {
    if (!title.trim()) {
      setError('Dê um título curto ao registro para continuar.');
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 3) return;
    setSubmitting(true);
    setError(null);
    const body: Record<string, unknown> = {
      workspaceId,
      categoria: category,
      titulo: title.trim(),
      descricao: description.trim() || undefined,
      localizacao: location.trim() || undefined,
      latitude: coords?.[0],
      longitude: coords?.[1],
      autorId: authorRef()
    };
    if (type === 'observacao') {
      body.bairro = neighborhood || undefined;
      body.cidade = city || undefined;
      body.estado = state || undefined;
      body.urgencia = level;
    } else if (type === 'problema') {
      body.severidade = level;
    }

    try {
      if (type === 'observacao') {
        const result = await captureObservation(body as unknown as ObservacaoInput);
        setSuccess(captureMessage(result));
      } else {
        await createEntity(meta.endpoint, body);
        setSuccess({
          title: `${meta.label} registrada`,
          description: 'O registro foi confirmado pelo servidor e entrou na memória do território.',
          tone: 'ok'
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o registro.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="modal-overlay" role="presentation">
        <section className="capture-dialog capture-result" role="dialog" aria-modal="true" aria-labelledby="capture-result-title">
          <div className={`capture-result-mark ${success.tone}`} aria-hidden="true">✓</div>
          <div role="status">
            <h2 id="capture-result-title">{success.title}</h2>
            <p>{success.description}</p>
          </div>
          <button type="button" className="primary-button" onClick={onCreated}>Concluir</button>
        </section>
      </div>
    );
  }

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !submitting) onClose();
    }}>
      <section className="capture-dialog" role="dialog" aria-modal="true" aria-labelledby="capture-title">
        <header className="capture-head">
          <div>
            <span className="overline">Registro de campo</span>
            <h2 id="capture-title">{meta.title}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>×</button>
        </header>

        <ol className="capture-steps" aria-label="Etapas do registro">
          {STEPS.map((label, index) => {
            const number = index + 1;
            return (
              <li key={label} className={number === step ? 'active' : number < step ? 'done' : ''}>
                <span>{number}</span><b>{label}</b>
              </li>
            );
          })}
        </ol>

        {!lockType && step === 1 && (
          <div className="type-chooser" aria-label="Tipo de registro">
            {(Object.keys(TYPES) as EntityType[]).map((entry) => (
              <button
                type="button"
                key={entry}
                aria-pressed={entry === type}
                className={entry === type ? 'selected' : ''}
                onClick={() => chooseType(entry)}
              >
                {TYPES[entry].label}
              </button>
            ))}
          </div>
        )}

        <form className="capture-form" onSubmit={handleSubmit}>
          {step === 1 && (
            <section className="capture-panel" aria-labelledby="capture-record-title">
              <div className="capture-panel-copy">
                <h3 id="capture-record-title">O que você observou?</h3>
                <p>Use palavras reconhecíveis por quem vive o território.</p>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="ne-category">Categoria</label>
                  <select id="ne-category" value={category} onChange={(event) => setCategory(event.target.value)}>
                    {meta.categories.map((entry) => <option key={entry}>{entry}</option>)}
                  </select>
                </div>
                {meta.levelField && (
                  <div className="field">
                    <label htmlFor="ne-level">{meta.levelLabel}</label>
                    <select id="ne-level" value={level} onChange={(event) => setLevel(event.target.value)}>
                      {NIVEIS.map((entry) => <option key={entry}>{entry}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="field">
                <label htmlFor="ne-title">Título</label>
                <input
                  id="ne-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex.: Nascente com resíduos na margem"
                  autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="ne-description">Relato de campo <span>opcional</span></label>
                <textarea
                  id="ne-description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descreva o que viu, sem interpretar além do que pode comprovar."
                />
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="capture-panel" aria-labelledby="capture-place-title">
              <div className="capture-panel-copy">
                <h3 id="capture-place-title">Onde aconteceu?</h3>
                <p>O local cria contexto. Se não puder informar agora, o registro ainda será preservado.</p>
              </div>
              <div className="field">
                <label htmlFor="ne-location">Endereço, comunidade ou referência</label>
                <AddressField
                  id="ne-location"
                  value={location}
                  onChange={setLocation}
                  onSelect={applyResult}
                  placeholder="Ex.: margem da nascente, Comunidade do Sol"
                />
              </div>
              {coords ? (
                <div className="capture-map">
                  <MapView
                    center={coords}
                    zoom={16}
                    height={220}
                    recenter
                    picker={{ position: coords, onPick: handlePick }}
                  />
                  <p>Toque no mapa ou arraste o marcador para ajustar o local.</p>
                </div>
              ) : (
                <div className="location-empty">
                  <b>Local ainda não definido</b>
                  <span>Você pode continuar e completar essa informação depois.</span>
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="capture-panel" aria-labelledby="capture-proof-title">
              <div className="capture-panel-copy">
                <h3 id="capture-proof-title">O que será preservado?</h3>
                <p>Confira o registro antes de colocá-lo na memória do território.</p>
              </div>
              <dl className="capture-review">
                <div><dt>Registro</dt><dd>{title}</dd></div>
                <div><dt>Contexto</dt><dd>{category} · {meta.levelLabel ? `${meta.levelLabel}: ${level.toLowerCase()}` : meta.label}</dd></div>
                <div><dt>Território</dt><dd>{location || [neighborhood, city, state].filter(Boolean).join(', ') || 'Local não informado'}</dd></div>
                <div><dt>Autoria</dt><dd>{authorRef() ?? 'Pessoa da sessão atual'}</dd></div>
              </dl>
              <div className="evidence-note">
                <b>Evidência disponível nesta etapa</b>
                <p>O relato, a autoria e o momento do registro serão preservados. Fotos e documentos ainda não são enviados por este fluxo.</p>
              </div>
              <p className="offline-note">Se a conexão falhar, a observação ficará salva neste aparelho até poder ser sincronizada.</p>
            </section>
          )}

          {error && <div className="form-error" role="alert">{error}</div>}

          <footer className="capture-actions">
            {step === 1 ? (
              <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
            ) : (
              <button type="button" className="ghost-button" onClick={() => { setError(null); setStep(step - 1); }}>Voltar</button>
            )}
            {step === 1 && (
              <button type="button" className="primary-button" onClick={advanceFromRecord}>Continuar para ancorar</button>
            )}
            {step === 2 && (
              <button type="button" className="primary-button" onClick={() => setStep(3)}>Continuar para comprovar</button>
            )}
            {step === 3 && (
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? 'Salvando…' : `Salvar ${meta.label.toLowerCase()}`}
              </button>
            )}
          </footer>
        </form>
      </section>
    </div>
  );
}
