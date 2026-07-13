import type { OutboxStatus } from './offlineStore';

export interface MutationFeedback {
  title: string;
  description: string;
  tone: 'ok' | 'pending' | 'attention';
}

export function mutationFeedback(status: OutboxStatus): MutationFeedback {
  if (status === 'SYNCED') {
    return {
      title: 'Sincronização concluída',
      description: 'O servidor confirmou o registro na memória compartilhada.',
      tone: 'ok'
    };
  }
  if (status === 'CONFLICT' || status === 'ACTION_REQUIRED' || status === 'BLOCKED') {
    return {
      title: 'Salvo neste aparelho; atenção necessária',
      description: 'O registro continua protegido localmente. Abra a sincronização para revisar o envio.',
      tone: 'attention'
    };
  }
  return {
    title: 'Salvo neste aparelho',
    description: 'O registro aguarda sincronização e ainda não aparece como dado confirmado.',
    tone: 'pending'
  };
}

export function mutationNotice(status: OutboxStatus): string {
  const feedback = mutationFeedback(status);
  return `${feedback.title}. ${feedback.description}`;
}
