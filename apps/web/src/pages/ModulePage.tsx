import { useEffect, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { createEntity, listEntities } from '../lib/api';
import { MODULE_CONFIGS, type ModuleConfig } from './moduleConfigs';

type Item = Record<string, unknown>;

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
              {f.type === 'textarea' ? (
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
    void listEntities<Item>(config.path, workspaceId).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }
  useEffect(refresh, [config.path, workspaceId]);

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

      {showCreate && (
        <CreateModal
          config={config}
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refresh(); }}
        />
      )}
    </div>
  );
}
