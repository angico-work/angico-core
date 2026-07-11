import type {
  Acao,
  Conversa,
  DashboardData,
  Evidencia,
  Indicador,
  MapPoint,
  Medicao,
  MemoriaEvent,
  Mensagem,
  MissaoRegistro,
  Observacao,
  Organizacao,
  Participacao,
  PessoaHit,
  Problema,
  RastroResponse,
  Recurso,
  RecursoUso,
  Resultado,
  Territorio,
  Workspace,
  WorkspaceMember
} from '../types';

type JsonRecord = Record<string, unknown>;
type ItemValidator = (value: unknown, workspaceId: string) => boolean;

function object(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === 'string';
}

function presentText(value: unknown): value is string {
  return text(value) && value.trim().length > 0;
}

function integer(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function nullableText(value: unknown): value is string | null {
  return value === null || text(value);
}

function nullableInteger(value: unknown): value is number | null {
  return value === null || integer(value);
}

function list<T>(value: unknown, item: (entry: unknown) => entry is T): value is T[] {
  return Array.isArray(value) && value.every(item);
}

function workspaceRecord(value: unknown, workspaceId: string): value is JsonRecord {
  return object(value) && value.workspaceId === workspaceId;
}

function titledRecord(value: unknown, workspaceId: string): value is JsonRecord {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && presentText(value.titulo)
    && presentText(value.status)
    && presentText(value.createdAt);
}

function isObservacao(value: unknown, workspaceId: string): value is Observacao {
  return titledRecord(value, workspaceId) && presentText(value.categoria);
}

function isProblema(value: unknown, workspaceId: string): value is Problema {
  return titledRecord(value, workspaceId) && presentText(value.categoria);
}

function isPotentialidade(value: unknown, workspaceId: string): boolean {
  return titledRecord(value, workspaceId) && presentText(value.categoria);
}

function isMissao(value: unknown, workspaceId: string): value is MissaoRegistro {
  return titledRecord(value, workspaceId) && finite(value.progresso);
}

function isAcao(value: unknown, workspaceId: string): value is Acao {
  return titledRecord(value, workspaceId);
}

function isPessoa(value: unknown, workspaceId: string): value is PessoaHit {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && presentText(value.nome)
    && nullableText(value.papel)
    && nullableText(value.angicoId)
    && presentText(value.createdAt);
}

function isEvidencia(value: unknown, workspaceId: string): value is Evidencia {
  if (!workspaceRecord(value, workspaceId)
    || !integer(value.id)
    || !['OBSERVACAO', 'ACAO', 'RESULTADO'].includes(String(value.subjectType))
    || !integer(value.subjectId)
    || !presentText(value.title)
    || !nullableText(value.description)
    || !nullableText(value.originalFilename)
    || !nullableText(value.contentType)
    || !(value.sizeBytes === null || (finite(value.sizeBytes) && value.sizeBytes >= 0))
    || !nullableText(value.sha256)
    || !presentText(value.capturedAt)
    || !presentText(value.recordedAt)
    || !presentText(value.actorId)
    || !nullableText(value.deviceId)
    || !nullableText(value.clientMutationId)
    || typeof value.hasFile !== 'boolean') return false;
  return !value.hasFile || (
    presentText(value.originalFilename)
    && presentText(value.contentType)
    && finite(value.sizeBytes)
    && value.sizeBytes >= 0
    && presentText(value.sha256)
    && /^[a-f0-9]{64}$/i.test(value.sha256)
  );
}

function isResultado(value: unknown, workspaceId: string): value is Resultado {
  return titledRecord(value, workspaceId)
    && integer(value.acaoId)
    && presentText(value.actorId)
    && presentText(value.occurredAt);
}

function isIndicador(value: unknown, workspaceId: string): value is Indicador {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && integer(value.territorioId)
    && presentText(value.nome)
    && presentText(value.status)
    && presentText(value.createdAt)
    && presentText(value.updatedAt);
}

function isMedicao(value: unknown, workspaceId: string): value is Medicao {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && integer(value.indicadorId)
    && finite(value.valor)
    && presentText(value.actorId)
    && presentText(value.measuredAt)
    && presentText(value.createdAt);
}

function isOrganizacao(value: unknown, workspaceId: string): value is Organizacao {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && presentText(value.nome)
    && presentText(value.tipo)
    && presentText(value.status)
    && presentText(value.actorId)
    && presentText(value.createdAt);
}

function isParticipacao(value: unknown, workspaceId: string): value is Participacao {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && integer(value.organizationId)
    && integer(value.pessoaId)
    && presentText(value.papel)
    && presentText(value.status)
    && presentText(value.startedAt)
    && nullableText(value.endedAt)
    && presentText(value.recordedAt)
    && presentText(value.actorId);
}

function isRecurso(value: unknown, workspaceId: string): value is Recurso {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && presentText(value.nome)
    && presentText(value.categoria)
    && presentText(value.unidade)
    && presentText(value.status)
    && presentText(value.actorId)
    && presentText(value.createdAt);
}

function isRecursoUso(value: unknown, workspaceId: string): value is RecursoUso {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && integer(value.recursoId)
    && integer(value.acaoId)
    && finite(value.quantidade)
    && presentText(value.unidade)
    && presentText(value.occurredAt)
    && presentText(value.recordedAt)
    && presentText(value.actorId);
}

export function isWorkspaceList(value: unknown): value is Workspace[] {
  return list(value, (entry): entry is Workspace => (
    object(entry)
    && presentText(entry.slug)
    && presentText(entry.nome)
    && (entry.descricao === undefined || nullableText(entry.descricao))
    && (entry.cidade === undefined || nullableText(entry.cidade))
    && (entry.estado === undefined || nullableText(entry.estado))
    && (entry.centerLatitude === undefined || entry.centerLatitude === null
      || (finite(entry.centerLatitude) && entry.centerLatitude >= -90 && entry.centerLatitude <= 90))
    && (entry.centerLongitude === undefined || entry.centerLongitude === null
      || (finite(entry.centerLongitude) && entry.centerLongitude >= -180 && entry.centerLongitude <= 180))
  ));
}

export function isWorkspaceMemberList(value: unknown, workspaceId: string): value is WorkspaceMember[] {
  return list(value, (entry): entry is WorkspaceMember => (
    workspaceRecord(entry, workspaceId)
    && integer(entry.id)
    && presentText(entry.actorId)
    && presentText(entry.displayName)
    && presentText(entry.role)
    && presentText(entry.status)
    && presentText(entry.joinedAt)
  ));
}

export function isDashboardData(value: unknown, workspaceId: string): value is DashboardData {
  if (!workspaceRecord(value, workspaceId) || !object(value.territory)
    || !presentText(value.territory.id) || !presentText(value.territory.name)
    || !text(value.territory.subtitle) || !presentText(value.memoryClaim)) return false;
  return list(value.stats, (item): item is DashboardData['stats'][number] => (
    object(item) && presentText(item.label) && (finite(item.value) || text(item.value)) && presentText(item.icon)
  )) && list(value.activities, (item): item is DashboardData['activities'][number] => (
    object(item) && presentText(item.title) && text(item.subtitle) && text(item.location)
    && presentText(item.time) && presentText(item.type)
  )) && list(value.missions, (item): item is DashboardData['missions'][number] => (
    object(item) && presentText(item.title) && finite(item.progress) && text(item.actions) && presentText(item.status)
  )) && list(value.impact, (item): item is DashboardData['impact'][number] => (
    object(item) && presentText(item.value) && presentText(item.label) && text(item.period) && presentText(item.icon)
  )) && list(value.categoryDistribution, (item): item is DashboardData['categoryDistribution'][number] => (
    object(item) && presentText(item.name) && finite(item.value)
  ));
}

export function isMapPointList(value: unknown): value is MapPoint[] {
  return list(value, (entry): entry is MapPoint => (
    object(entry)
    && ['observacao', 'problema', 'potencialidade'].includes(String(entry.type))
    && integer(entry.id)
    && presentText(entry.titulo)
    && presentText(entry.categoria)
    && presentText(entry.status)
    && finite(entry.latitude)
    && entry.latitude >= -90
    && entry.latitude <= 90
    && finite(entry.longitude)
    && entry.longitude >= -180
    && entry.longitude <= 180
  ));
}

export function isMemoriaEventList(value: unknown): value is MemoriaEvent[] {
  return list(value, (entry): entry is MemoriaEvent => (
    object(entry)
    && presentText(entry.entityType)
    && presentText(entry.entityId)
    && presentText(entry.eventType)
    && nullableText(entry.actorId)
    && presentText(entry.occurredAt)
  ));
}

export function isTerritorioList(value: unknown, workspaceId: string): value is Territorio[] {
  return list(value, (entry): entry is Territorio => (
    workspaceRecord(entry, workspaceId)
    && integer(entry.id)
    && presentText(entry.nome)
    && (entry.latitude === null || (finite(entry.latitude) && entry.latitude >= -90 && entry.latitude <= 90))
    && (entry.longitude === null || (finite(entry.longitude) && entry.longitude >= -180 && entry.longitude <= 180))
    && Array.isArray(entry.boundingBox)
    && entry.boundingBox.every(finite)
    && (entry.boundingBox.length === 0 || entry.boundingBox.length === 4)
  ));
}

function isMensagem(value: unknown, workspaceId: string, conversaId?: number): value is Mensagem {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && integer(value.conversaId)
    && (conversaId === undefined || value.conversaId === conversaId)
    && nullableInteger(value.senderPessoaId)
    && nullableText(value.senderNome)
    && text(value.corpo)
    && presentText(value.status)
    && presentText(value.occurredAt)
    && presentText(value.recordedAt)
    && presentText(value.createdAt)
    && list(value.anexos, (attachment): attachment is Mensagem['anexos'][number] => (
      object(attachment) && integer(attachment.id) && presentText(attachment.originalFilename)
      && presentText(attachment.contentType) && finite(attachment.sizeBytes)
      && presentText(attachment.attachmentType) && presentText(attachment.createdAt)
    ))
    && Array.isArray(value.relacoes)
    && value.relacoes.every(text);
}

export function isMensagemList(value: unknown, workspaceId: string, conversaId: number): value is Mensagem[] {
  return list(value, (entry): entry is Mensagem => isMensagem(entry, workspaceId, conversaId));
}

export function isConversaList(value: unknown, workspaceId: string): value is Conversa[] {
  return list(value, (entry): entry is Conversa => (
    workspaceRecord(entry, workspaceId)
    && integer(entry.id)
    && nullableInteger(entry.territorioId)
    && presentText(entry.contextEntityType)
    && presentText(entry.contextEntityId)
    && presentText(entry.titulo)
    && nullableInteger(entry.createdByPessoaId)
    && presentText(entry.status)
    && presentText(entry.createdAt)
    && presentText(entry.updatedAt)
    && nonNegativeInteger(entry.unreadCount)
    && list(entry.mensagens, (message): message is Mensagem => isMensagem(message, workspaceId, entry.id as number))
  ));
}

function reference(value: unknown): boolean {
  return object(value) && presentText(value.type) && presentText(value.id) && presentText(value.resource);
}

function stage(value: unknown): boolean {
  return object(value) && reference(value.reference) && presentText(value.name)
    && nullableText(value.status) && nullableText(value.occurredAt)
    && nullableText(value.recordedAt) && nullableText(value.syncStatus);
}

export function isRastroResponse(value: unknown, workspaceId: string): value is RastroResponse {
  return workspaceRecord(value, workspaceId)
    && stage(value.root)
    && Array.isArray(value.stages) && value.stages.every(stage)
    && Array.isArray(value.relations) && value.relations.every((entry) => (
      object(entry) && presentText(entry.type) && reference(entry.origin) && reference(entry.destination)
      && nullableText(entry.actorId) && nullableText(entry.recordedAt)
    ))
    && Array.isArray(value.events) && value.events.every((entry) => (
      object(entry) && presentText(entry.id) && presentText(entry.type) && reference(entry.subject)
      && nullableText(entry.actorId) && nullableText(entry.occurredAt)
      && nullableText(entry.recordedAt) && nullableText(entry.syncStatus)
    ))
    && Array.isArray(value.participants) && value.participants.every((entry) => (
      object(entry) && reference(entry.participant) && presentText(entry.name)
      && nullableText(entry.status) && presentText(entry.relationType) && reference(entry.at)
    ))
    && Array.isArray(value.gaps) && value.gaps.every((entry) => (
      object(entry) && presentText(entry.code) && reference(entry.subject)
      && presentText(entry.reason) && presentText(entry.nextAction)
      && (entry.expectedRelation === null || (object(entry.expectedRelation)
        && presentText(entry.expectedRelation.originType)
        && presentText(entry.expectedRelation.relationType)
        && presentText(entry.expectedRelation.destinationType)))
    ))
    && object(value.limits)
    && nonNegativeInteger(value.limits.maxNodes)
    && nonNegativeInteger(value.limits.maxRelations)
    && nonNegativeInteger(value.limits.maxEvents)
    && typeof value.limits.truncated === 'boolean'
    && presentText(value.asOf);
}

export interface EntityListContract {
  resource: string;
  root?: string;
  validate: (value: unknown, workspaceId: string) => boolean;
}

const ENTITY_CONTRACTS: Record<string, { resource: string; item: ItemValidator }> = {
  '/api/observacoes': { resource: 'observacoes', item: isObservacao },
  '/api/problemas': { resource: 'problemas', item: isProblema },
  '/api/potencialidades': { resource: 'potencialidades', item: isPotentialidade },
  '/api/missoes': { resource: 'missoes', item: isMissao },
  '/api/acoes': { resource: 'acoes', item: isAcao },
  '/api/pessoas': { resource: 'pessoas', item: isPessoa },
  '/api/evidencias': { resource: 'evidencias', item: isEvidencia },
  '/api/resultados': { resource: 'resultados', item: isResultado },
  '/api/indicadores': { resource: 'indicadores', item: isIndicador },
  '/api/medicoes': { resource: 'medicoes', item: isMedicao },
  '/api/organizacoes': { resource: 'organizacoes', item: isOrganizacao },
  '/api/recursos': { resource: 'recursos', item: isRecurso }
};

export function entityListContract(path: string): EntityListContract {
  const exact = ENTITY_CONTRACTS[path];
  if (exact) {
    return {
      resource: exact.resource,
      validate: (value, workspaceId) => Array.isArray(value)
        && value.every((entry) => exact.item(entry, workspaceId))
    };
  }
  const participation = path.match(/^\/api\/organizacoes\/(\d+)\/participacoes$/);
  if (participation) {
    const organizationId = Number(participation[1]);
    return {
      resource: 'participacoes',
      root: `organizacao:${participation[1]}`,
      validate: (value, workspaceId) => Array.isArray(value)
        && value.every((entry) => isParticipacao(entry, workspaceId)
          && entry.organizationId === organizationId)
    };
  }
  const usage = path.match(/^\/api\/recursos\/(\d+)\/usos$/);
  if (usage) {
    const resourceId = Number(usage[1]);
    return {
      resource: 'recurso-usos',
      root: `recurso:${usage[1]}`,
      validate: (value, workspaceId) => Array.isArray(value)
        && value.every((entry) => isRecursoUso(entry, workspaceId)
          && entry.recursoId === resourceId)
    };
  }
  throw new Error(`A leitura ${path} não possui contrato offline.`);
}
