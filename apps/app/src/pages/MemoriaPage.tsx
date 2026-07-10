import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppContext } from '../components/AppShell';
import { loadMemoria } from '../lib/api';
import type { MemoriaEvent } from '../types';

const ENTITY_COLOR: Record<string, string> = {
  observacao: '#2c8fbd', problema: '#f97316', potencialidade: '#2aa84a',
  missao: '#7c3aed', acao: '#12a044', pessoa: '#004B6C'
};

function describe(e: MemoriaEvent): string {
  const map: Record<string, string> = {
    'observacao.registrada': 'Observação registrada',
    'problema.registrado': 'Problema registrado',
    'potencialidade.registrada': 'Potencialidade registrada',
    'missao.criada': 'Missão criada',
    'acao.iniciada': 'Ação iniciada',
    'pessoa.engajada': 'Pessoa engajada'
  };
  return map[e.eventType] ?? e.eventType;
}

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function MemoriaPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [events, setEvents] = useState<MemoriaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void loadMemoria(workspaceId).then((e) => { setEvents(e); setLoading(false); });
  }, [workspaceId]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Memória do Território</h1>
          <p>Cada evento preserva autoria, origem e momento — a memória viva do Angico.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Carregando…</p>
      ) : events.length === 0 ? (
        <div className="empty-state"><p>A memória ainda está vazia. Registre observações para começar.</p></div>
      ) : (
        <div className="timeline">
          {events.map((e) => {
            const color = ENTITY_COLOR[e.entityType] ?? '#6b7280';
            return (
              <div className="timeline-item" key={e.sequence}>
                <span className="timeline-dot" style={{ background: color }} />
                <div className="timeline-body">
                  <div className="timeline-top">
                    <strong>{describe(e)}</strong>
                    <span className="entity-badge" style={{ background: color }}>{e.entityType} #{e.entityId}</span>
                  </div>
                  <span className="entity-meta">
                    {when(e.occurredAt)}{e.actorId ? ` · por ${e.actorId}` : ''} · evento #{e.sequence}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
