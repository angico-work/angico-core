import { useSyncExternalStore } from 'react';
import {
  ACCOUNT_SNAPSHOT_WORKSPACE,
  getOfflineReadSources,
  subscribeOfflineReadSources
} from '../lib/offlineReadState';

interface Props {
  ownerId?: string;
  workspaceId: string;
  active: boolean;
}

const RESOURCE_LABELS: Record<string, string> = {
  workspaces: 'Espaços de trabalho',
  'workspace-members': 'Integrantes',
  dashboard: 'Painel',
  'map-points': 'Mapa',
  'memory-events': 'Memória',
  territories: 'Territórios',
  observacoes: 'Observações',
  problemas: 'Problemas',
  potencialidades: 'Potencialidades',
  missoes: 'Missões',
  acoes: 'Ações',
  pessoas: 'Pessoas',
  evidencias: 'Evidências',
  resultados: 'Resultados',
  indicadores: 'Indicadores',
  medicoes: 'Medições',
  organizacoes: 'Organizações',
  participacoes: 'Participações',
  recursos: 'Recursos',
  'recurso-usos': 'Uso de recursos',
  conversations: 'Conversas',
  'conversation-messages': 'Mensagens',
  rastro: 'Rastro'
};

function when(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function OfflineReadNotice({ ownerId, workspaceId, active }: Props) {
  const sources = useSyncExternalStore(
    subscribeOfflineReadSources,
    getOfflineReadSources,
    getOfflineReadSources
  );
  if (!active || !ownerId) return null;
  const visible = sources
    .filter((source) => source.ownerId === ownerId
      && (source.workspaceId === workspaceId || source.workspaceId === ACCOUNT_SNAPSHOT_WORKSPACE))
    .sort((left, right) => left.resource.localeCompare(right.resource) || left.savedAt.localeCompare(right.savedAt));
  if (visible.length === 0) return null;

  return (
    <aside className="offline-note" role="status">
      <b>Você está vendo dados confirmados salvos neste aparelho.</b>
      {visible.map((source) => (
        <span key={`${source.resource}:${source.root ?? ''}:${JSON.stringify(source.query ?? {})}`}>
          {RESOURCE_LABELS[source.resource] ?? source.resource} · <time dateTime={source.savedAt}>{when(source.savedAt)}</time>
        </span>
      ))}
    </aside>
  );
}
