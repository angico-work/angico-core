import type { Mensagem } from '../../types';
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

export const LOCAL_MESSAGE_STATUS: Partial<Record<OutboxStatus, { label: string; tone: string }>> = {
  QUEUED: { label: 'Na fila', tone: 'pending' },
  SYNCING: { label: 'Enviando', tone: 'active' },
  SYNCED: { label: 'Enviada', tone: 'ok' },
  RETRYABLE_ERROR: { label: 'Falha temporária', tone: 'attention' },
  CONFLICT: { label: 'Conflito', tone: 'attention' },
  BLOCKED: { label: 'Sessão encerrada', tone: 'attention' },
  ACTION_REQUIRED: { label: 'Revisão necessária', tone: 'attention' }
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

export function mergeTimeline(remote: Mensagem[], local: LocalMessage[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  const remoteClientIds = new Set(remote.map((message) => message.clientMessageId).filter(Boolean));
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
