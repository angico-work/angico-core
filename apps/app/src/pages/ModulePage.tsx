import { useEffect, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { createEntity, getSession, listEntities } from '../lib/api';
import { listLocalObservations } from '../lib/offlineStore';
import AngicoIdField from '../components/AngicoIdField';
import NewEntityModal, { type EntityType } from '../components/NewEntityModal';
import { MODULE_CONFIGS, type ModuleConfig } from './moduleConfigs';

type Item = Record<string, unknown>;

// Geo-anchored modules use the rich modal (address search + map + creator);
// the others keep the generic config form.
const GEO_TYPES: Record<string, EntityType> = {
  observacoes: 'observacao',
  problemas: 'problema',
  potencialidades: 'potencialidade'
};

function CreateModal({ config, workspaceId, onClose, onCreated }: {
  config: ModuleConfig; workspaceId: string; onClose: () => void; onCreated: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    config.fields.forEach((f) => { init[f.name] = f.type === 'select' && f.options ? f.options[0] : ''; });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const body: Record<string, unknown> = { workspaceId };
    config.fields.forEach((f) => { if (values[f.name]) body[f.name] = values[f.name]; });
    try {
      await createEntity(config.path, body);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{config.newLabel}</h2>
        <form onSubmit={submit}>
          {config.fields.map((f) => (
            <div className="field" key={f.name}>
              <label htmlFor={`f-${f.name}`}>{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'angico-search' ? (
                <AngicoIdField
                  id={`f-${f.name}`}
                  workspaceId={workspaceId}
                  value={values[f.name]}
                  placeholder={f.placeholder}
                  onChange={(t) => setValues((v) => ({ ...v, [f.name]: t }))}
                  onPick={(p) => setValues((v) => ({ ...v, angicoId: p.angicoId ?? '', nome: p.nome, papel: p.papel ?? v.papel }))}
                />
              ) : f.type === 'textarea' ? (
                <textarea id={`f-${f.name}`} rows={3} value={values[f.name]} placeholder={f.placeholder}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
              ) : f.type === 'select' ? (
                <select id={`f-${f.name}`} value={values[f.name]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
                  {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input id={`f-${f.name}`} value={values[f.name]} placeholder={f.placeholder} required={f.required}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
              )}
            </div>
          ))}
          {error && <div style={{ color: '#dc2626', fontSize: 14 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" className="ghost-button" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ModulePage({ configKey }: { configKey: string }) {
  const { workspaceId } = useOutletContext<AppContext>();
  const config = MODULE_CONFIGS[configKey];
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function refresh() {
    setLoading(true);
    void listEntities<Item>(config.path, workspaceId).then(async (data) => {
      if (configKey !== 'observacoes') return data;
      const session = getSession();
      const ownerId = session?.angicoId || (session ? `pessoa-${session.pessoaId}` : undefined);
      if (!ownerId) return data;
      const local = await listLocalObservations(ownerId, workspaceId);
      const pending = local
        .filter((record) => record.syncStatus !== 'SYNCED')
        .map<Item>((record) => ({
          ...record.data,
          id: `local-${record.clientMutationId}`,
          status: record.syncStatus,
          syncStatus: record.syncStatus
        }));
      return [...pending, ...data];
    }).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }
  useEffect(refresh, [config.path, workspaceId]);
  useEffect(() => {
    window.addEventListener('angico:sync-state', refresh);
    return () => window.removeEventListener('angico:sync-state', refresh);
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <button className="primary-button" onClick={() => setShowCreate(true)}>＋ {config.newLabel}</button>
      </div>

      {loading ? (
        <p className="muted">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum registro ainda.</p>
          <button className="secondary-button" onClick={() => setShowCreate(true)}>{config.newLabel}</button>
        </div>
      ) : (
        <div className="entity-grid">
          {items.map((item) => (
            <article className="entity-card" key={String(item.id)} style={{ borderLeftColor: config.accent }}>
              <div className="entity-card-head">
                <strong>{config.primary(item)}</strong>
                {config.badge?.(item) && <span className="entity-badge" style={{ background: config.accent }}>{config.badge(item)}</span>}
              </div>
              {config.meta(item).map((m, idx) => <span className="entity-meta" key={idx}>{m}</span>)}
              <span className="entity-id">#{String(item.id)}</span>
            </article>
          ))}
        </div>
      )}

      {showCreate && (GEO_TYPES[configKey] ? (
        <NewEntityModal
          workspaceId={workspaceId}
          initialType={GEO_TYPES[configKey]}
          lockType
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refresh(); }}
        />
      ) : (
        <CreateModal
          config={config}
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refresh(); }}
        />
      ))}
    </div>
  );
}
