import { describe, expect, it } from 'vitest';
import {
  entityListContract,
  isConversaList,
  isDashboardData,
  isRastroResponse,
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
});
