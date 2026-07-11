import { describe, expect, it } from 'vitest';
import {
  entityListContract,
  isConversaList,
  isDashboardData,
  isMapPointList,
  isMemoriaEventList,
  isMensagemList,
  isRastroResponse,
  isTerritorioList,
  isWorkspaceList
} from './apiContracts';

describe('API snapshot contracts', () => {
  it('rejects an invalid item instead of accepting any array', () => {
    const contract = entityListContract('/api/evidencias');

    expect(contract.validate([], 'territorio-a')).toBe(true);
    expect(contract.validate([{ id: 8 }], 'territorio-a')).toBe(false);
    expect(contract.validate([{
      id: 8,
      workspaceId: 'territorio-b',
      subjectType: 'ACAO',
      subjectId: 4,
      title: 'Registro',
      description: null,
      originalFilename: null,
      contentType: null,
      sizeBytes: null,
      sha256: null,
      capturedAt: '2026-07-10T12:00:00Z',
      recordedAt: '2026-07-10T12:01:00Z',
      actorId: 'ana.sp',
      deviceId: null,
      clientMutationId: null,
      hasFile: false
    }], 'territorio-a')).toBe(false);
  });

  it('maps nested resources to distinct roots', () => {
    expect(entityListContract('/api/organizacoes/12/participacoes')).toMatchObject({
      resource: 'participacoes', root: 'organizacao:12'
    });
    expect(entityListContract('/api/recursos/5/usos')).toMatchObject({
      resource: 'recurso-usos', root: 'recurso:5'
    });
    expect(() => entityListContract('/api/desconhecido')).toThrow('contrato');
  });

  it('requires the requested workspace throughout dashboard and conversation payloads', () => {
    const dashboard = {
      workspaceId: 'territorio-a',
      territory: { id: '1', name: 'Território A', subtitle: 'Bairro' },
      stats: [], activities: [], missions: [], impact: [], categoryDistribution: [],
      memoryClaim: 'Dados confirmados.'
    };
    const conversation = {
      id: 3,
      workspaceId: 'territorio-a',
      territorioId: null,
      contextEntityType: 'TERRITORIO',
      contextEntityId: '1',
      titulo: 'Cuidado da praça',
      createdByPessoaId: 7,
      status: 'ATIVA',
      createdAt: '2026-07-10T12:00:00Z',
      updatedAt: '2026-07-10T12:01:00Z',
      unreadCount: 0,
      mensagens: []
    };

    expect(isDashboardData(dashboard, 'territorio-a')).toBe(true);
    expect(isDashboardData(dashboard, 'territorio-b')).toBe(false);
    expect(isConversaList([conversation], 'territorio-a')).toBe(true);
    expect(isConversaList([{ ...conversation, mensagens: [{}] }], 'territorio-a')).toBe(false);
  });

  it('validates workspace and Rastro items beyond their outer container', () => {
    expect(isWorkspaceList([{ slug: 'territorio-a', nome: 'Território A' }])).toBe(true);
    expect(isWorkspaceList([{ slug: '', nome: 'Território A' }])).toBe(false);

    const trace = {
      workspaceId: 'territorio-a',
      root: {
        reference: { type: 'MISSAO', id: '42', resource: '/api/missoes/42' },
        name: 'Cuidar da nascente', status: null, occurredAt: null, recordedAt: null, syncStatus: null
      },
      stages: [], relations: [], events: [], participants: [], gaps: [],
      limits: { maxNodes: 100, maxRelations: 200, maxEvents: 300, truncated: false },
      asOf: '2026-07-10T14:00:00Z'
    };

    expect(isRastroResponse(trace, 'territorio-a')).toBe(true);
    expect(isRastroResponse({ ...trace, root: { name: 'sem referência' } }, 'territorio-a')).toBe(false);
  });

  it('requires map and memory records to belong to the requested workspace', () => {
    const point = {
      workspaceId: 'territorio-a',
      type: 'observacao',
      id: 4,
      titulo: 'Nascente observada',
      categoria: 'Água',
      status: 'REGISTRADA',
      latitude: -23.5,
      longitude: -46.6
    };
    const event = {
      workspaceId: 'territorio-a',
      sequence: 9,
      entityType: 'OBSERVACAO',
      entityId: '4',
      eventType: 'OBSERVACAO_REGISTRADA',
      actorId: 'ana.sp',
      occurredAt: '2026-07-10T12:00:00Z'
    };

    expect(isMapPointList([point], 'territorio-a')).toBe(true);
    expect(isMapPointList([point], 'territorio-b')).toBe(false);
    expect(isMemoriaEventList([event], 'territorio-a')).toBe(true);
    expect(isMemoriaEventList([event], 'territorio-b')).toBe(false);
  });

  it('rejects invalid dates in required and optional contract fields', () => {
    const evidence = {
      id: 8,
      workspaceId: 'territorio-a',
      subjectType: 'ACAO',
      subjectId: 4,
      title: 'Registro',
      description: null,
      originalFilename: null,
      contentType: null,
      sizeBytes: null,
      sha256: null,
      capturedAt: 'data-inválida',
      recordedAt: '2026-07-10T12:01:00Z',
      actorId: 'ana.sp',
      deviceId: null,
      clientMutationId: null,
      hasFile: false
    };
    const workspace = {
      slug: 'territorio-a',
      nome: 'Território A',
      createdAt: 'ontem'
    };
    const memory = {
      workspaceId: 'territorio-a',
      entityType: 'ACAO',
      entityId: '4',
      eventType: 'ACAO_INICIADA',
      actorId: null,
      occurredAt: '2026-07-10T12:00:00Z',
      recordedAt: 'sem-data'
    };

    expect(entityListContract('/api/evidencias').validate([evidence], 'territorio-a')).toBe(false);
    expect(isWorkspaceList([workspace])).toBe(false);
    expect(isMemoriaEventList([memory], 'territorio-a')).toBe(false);
  });

  it('validates domain enums and their nullable linked fields', () => {
    const organization = {
      id: 3,
      workspaceId: 'territorio-a',
      nome: 'Associação da praça',
      tipo: 'ASSOCIACAO',
      status: 'ATIVA',
      missaoId: null,
      missionRelation: null,
      actorId: 'ana.sp',
      createdAt: '2026-07-10T12:00:00Z'
    };
    const resource = {
      id: 5,
      workspaceId: 'territorio-a',
      nome: 'Enxadas',
      categoria: 'EQUIPAMENTO',
      unidade: 'un',
      descricao: null,
      status: 'ATIVO',
      actorId: 'ana.sp',
      createdAt: '2026-07-10T12:00:00Z'
    };

    expect(entityListContract('/api/organizacoes').validate([organization], 'territorio-a')).toBe(true);
    expect(entityListContract('/api/organizacoes').validate([
      { ...organization, tipo: 'TIPO_INVENTADO' }
    ], 'territorio-a')).toBe(false);
    expect(entityListContract('/api/organizacoes').validate([
      { ...organization, missionRelation: 'CONDUZ' }
    ], 'territorio-a')).toBe(false);
    expect(entityListContract('/api/recursos').validate([resource], 'territorio-a')).toBe(true);
    expect(entityListContract('/api/recursos').validate([
      { ...resource, categoria: 'INVENTADO' }
    ], 'territorio-a')).toBe(false);
  });

  it('rejects unsafe coordinates, bounding boxes and attachment sizes', () => {
    const territory = {
      id: 1,
      workspaceId: 'territorio-a',
      nome: 'Território A',
      tipo: null,
      cidade: null,
      bairro: null,
      estado: null,
      pais: null,
      latitude: -23.5,
      longitude: -46.6,
      boundingBox: [-24, -23, -47, -46],
      status: 'ATIVO',
      updatedAt: '2026-07-10T12:00:00Z'
    };
    const message = {
      id: 21,
      workspaceId: 'territorio-a',
      conversaId: 12,
      senderPessoaId: null,
      senderNome: null,
      corpo: '',
      latitude: null,
      longitude: null,
      localDescricao: null,
      linkedEntityType: null,
      linkedEntityId: null,
      clientMessageId: null,
      deviceId: null,
      status: 'ENVIADA',
      occurredAt: '2026-07-10T12:00:00Z',
      recordedAt: '2026-07-10T12:01:00Z',
      createdAt: '2026-07-10T12:01:00Z',
      anexos: [{
        id: 2,
        originalFilename: 'foto.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 24,
        attachmentType: 'IMAGEM',
        createdAt: '2026-07-10T12:01:00Z'
      }],
      relacoes: []
    };

    expect(isTerritorioList([territory], 'territorio-a')).toBe(true);
    expect(isTerritorioList([{ ...territory, longitude: null }], 'territorio-a')).toBe(false);
    expect(isTerritorioList([{ ...territory, boundingBox: [-23, -24, -47, -46] }], 'territorio-a')).toBe(false);
    expect(isTerritorioList([{ ...territory, boundingBox: [-24, -23, -181, -46] }], 'territorio-a')).toBe(false);
    expect(isWorkspaceList([{
      slug: 'territorio-a', nome: 'Território A', centerLatitude: 91, centerLongitude: 0
    }])).toBe(false);
    expect(isWorkspaceList([{
      slug: 'territorio-a', nome: 'Território A', centerLatitude: -23.5
    }])).toBe(false);
    expect(isMensagemList([message], 'territorio-a', 12)).toBe(true);
    expect(isMensagemList([{
      ...message, linkedEntityType: 'OBSERVACAO', linkedEntityId: '42'
    }], 'territorio-a', 12)).toBe(true);
    expect(isMensagemList([{
      ...message, linkedEntityType: 'PESSOA', linkedEntityId: '7'
    }], 'territorio-a', 12)).toBe(false);
    expect(isMensagemList([{
      ...message, linkedEntityType: 'OBSERVACAO', linkedEntityId: '0'
    }], 'territorio-a', 12)).toBe(false);
    expect(isMensagemList([{
      ...message,
      anexos: [{ ...message.anexos[0], sizeBytes: -1 }]
    }], 'territorio-a', 12)).toBe(false);
    expect(isMensagemList([{ ...message, latitude: 91, longitude: 0 }], 'territorio-a', 12)).toBe(false);
  });
});
