import { describe, expect, it } from 'vitest';
import type { LocalMessage } from '../../lib/offlineStore';
import type { Mensagem } from '../../types';
import { conversationContexts, mergeTimeline } from './messageView';

const local: LocalMessage = {
  key: 'local',
  ownerId: 'ana.sp',
  workspaceId: 'territorio-a',
  conversationId: 12,
  clientMessageId: 'shared-client-id',
  body: 'Mensagem local da Ana.',
  occurredAt: '2026-07-10T12:00:00Z',
  deviceId: 'device-ana',
  attachments: [],
  syncStatus: 'QUEUED',
  updatedAt: '2026-07-10T12:00:00Z'
};

function remote(senderPessoaId: number): Mensagem {
  return {
    id: 90 + senderPessoaId,
    workspaceId: 'territorio-a',
    conversaId: 12,
    senderPessoaId,
    senderNome: senderPessoaId === 7 ? 'Ana' : 'Bia',
    corpo: 'Mensagem remota.',
    latitude: null,
    longitude: null,
    localDescricao: null,
    linkedEntityType: null,
    linkedEntityId: null,
    clientMessageId: 'shared-client-id',
    deviceId: 'device-remote',
    status: 'ENVIADA',
    occurredAt: '2026-07-10T12:01:00Z',
    recordedAt: '2026-07-10T12:01:00Z',
    createdAt: '2026-07-10T12:01:00Z',
    anexos: [],
    relacoes: []
  };
}

describe('message timeline projection', () => {
  it('offers every entity type accepted as a conversation context', () => {
    const contexts = conversationContexts([{
      id: 4,
      workspaceId: 'territorio-a',
      nome: 'Nascente Sul',
      tipo: 'BAIRRO',
      cidade: null,
      bairro: null,
      estado: null,
      pais: null,
      latitude: null,
      longitude: null,
      boundingBox: [],
      status: 'ATIVO',
      updatedAt: null
    }], [
      { type: 'OBSERVACAO', label: 'Observação', entities: [{ id: 5, titulo: 'Água turva' }] },
      { type: 'PROBLEMA', label: 'Problema', entities: [{ id: 6, titulo: 'Margem exposta' }] },
      { type: 'POTENCIALIDADE', label: 'Potencialidade', entities: [{ id: 7, titulo: 'Viveiro local' }] },
      { type: 'MISSAO', label: 'Missão', entities: [{ id: 8, titulo: 'Proteger a nascente' }] },
      { type: 'ACAO', label: 'Ação', entities: [{ id: 9, titulo: 'Cercar o trecho' }] },
      { type: 'RESULTADO', label: 'Resultado', entities: [{ id: 10, titulo: 'Trecho protegido' }] },
      { type: 'INDICADOR', label: 'Indicador', entities: [{ id: 11, nome: 'Metros protegidos' }] }
    ]);

    expect(contexts.map((context) => context.key)).toEqual([
      'TERRITORIO:4', 'OBSERVACAO:5', 'PROBLEMA:6', 'POTENCIALIDADE:7',
      'MISSAO:8', 'ACAO:9', 'RESULTADO:10', 'INDICADOR:11'
    ]);
  });

  it('does not hide a local pending message when another sender reuses its client id', () => {
    const timeline = mergeTimeline([remote(8)], [local], 7);

    expect(timeline).toHaveLength(2);
    expect(timeline.some((item) => item.kind === 'local')).toBe(true);
  });

  it('deduplicates the local projection only against the current sender confirmation', () => {
    const timeline = mergeTimeline([remote(7)], [local], 7);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].kind).toBe('remote');
  });
});
