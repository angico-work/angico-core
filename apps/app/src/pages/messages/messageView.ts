import type { Mensagem, Territorio } from '../../types';
import type { LocalMessage, OutboxStatus } from '../../lib/offlineStore';

export function when(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function contextLabel(type: string): string {
  const labels: Record<string, string> = {
    TERRITORIO: 'Território',
    OBSERVACAO: 'Observação',
    PROBLEMA: 'Problema',
    POTENCIALIDADE: 'Potencialidade',
    MISSAO: 'Missão',
    ACAO: 'Ação',
    RESULTADO: 'Resultado',
    INDICADOR: 'Indicador'
  };
  return labels[type] ?? 'Contexto territorial';
}

export function fileSignature(files: File[]): string {
  return files.map((file) => `${file.name}:${file.size}:${file.type}:${file.lastModified}`).join('|');
}

export interface ConversationContext {
  key: string;
  type: 'TERRITORIO' | 'MISSAO' | 'ACAO';
  id: string;
  label: string;
  territoryId?: number;
}

function entityContexts(
  type: 'MISSAO' | 'ACAO',
  label: string,
  entities: Record<string, unknown>[]
): ConversationContext[] {
  return entities.flatMap((entity) => {
    const id = entity.id;
    const title = entity.titulo;
    if ((typeof id !== 'number' && typeof id !== 'string') || typeof title !== 'string' || !title.trim()) {
      return [];
    }
    const normalizedId = String(id);
    return [{ key: `${type}:${normalizedId}`, type, id: normalizedId, label: `${label} · ${title}` }];
  });
}

export function conversationContexts(
  territories: Territorio[],
  missions: Record<string, unknown>[],
  actions: Record<string, unknown>[]
): ConversationContext[] {
  return [
    ...territories.map((territory) => ({
      key: `TERRITORIO:${territory.id}`,
      type: 'TERRITORIO' as const,
      id: String(territory.id),
      label: `Território · ${territory.nome}${territory.cidade ? ` · ${territory.cidade}` : ''}`,
      territoryId: territory.id
    })),
    ...entityContexts('MISSAO', 'Missão', missions),
    ...entityContexts('ACAO', 'Ação', actions)
  ];
}

export const LOCAL_MESSAGE_STATUS: Partial<Record<OutboxStatus, { label: string; tone: string }>> = {
  QUEUED: { label: 'Na fila', tone: 'pending' },
  SYNCING: { label: 'Enviando', tone: 'active' },
  SYNCED: { label: 'Enviada', tone: 'ok' },
  RETRYABLE_ERROR: { label: 'Falha temporária', tone: 'attention' },
  CONFLICT: { label: 'Conflito', tone: 'attention' },
  BLOCKED: { label: 'Sessão encerrada', tone: 'attention' },
  ACTION_REQUIRED: { label: 'Revisão necessária', tone: 'attention' },
  SUPERSEDED: { label: 'Substituída', tone: 'muted' },
  DISCARDED: { label: 'Descartada', tone: 'muted' }
};

interface RemoteTimelineItem {
  key: string;
  kind: 'remote';
  message: Mensagem;
}

interface LocalTimelineItem {
  key: string;
  kind: 'local';
  message: LocalMessage;
}

export type TimelineItem = RemoteTimelineItem | LocalTimelineItem;

export function mergeTimeline(
  remote: Mensagem[],
  local: LocalMessage[],
  currentPessoaId: number | null
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const remoteClientIds = new Set(remote
    .filter((message) => currentPessoaId != null && message.senderPessoaId === currentPessoaId)
    .map((message) => message.clientMessageId)
    .filter(Boolean));
  const remoteIds = new Set(remote.map((message) => message.id));
  remote.forEach((message) => items.push({ key: `remote-${message.id}`, kind: 'remote', message }));
  local.forEach((message) => {
    if (message.remote) {
      if (!remoteIds.has(message.remote.id)) {
        items.push({ key: `remote-${message.remote.id}`, kind: 'remote', message: message.remote });
      }
      return;
    }
    if (!remoteClientIds.has(message.clientMessageId)) {
      items.push({ key: `local-${message.clientMessageId}`, kind: 'local', message });
    }
  });
  return items.sort((left, right) => left.message.occurredAt.localeCompare(right.message.occurredAt));
}
