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
import { isValidMessageLinkPair } from './messageLinks';

type JsonRecord = Record<string, unknown>;
type ItemValidator = (value: unknown, workspaceId: string) => boolean;

const ICON_NAMES = new Set([
  'leaf', 'warning', 'target', 'people', 'sprout', 'map', 'observation', 'mission',
  'action', 'indicator', 'memory', 'report', 'trash', 'tree', 'check', 'search',
  'bell', 'cloud', 'help', 'exit', 'message'
]);
const EVIDENCE_SUBJECT_TYPES = new Set(['OBSERVACAO', 'ACAO', 'RESULTADO']);
const ORGANIZATION_TYPES = new Set([
  'COLETIVO', 'ASSOCIACAO', 'ONG', 'COOPERATIVA', 'ESCOLA',
  'PODER_PUBLICO', 'EMPRESA', 'OUTRA'
]);
const ORGANIZATION_MISSION_RELATIONS = new Set(['CONDUZ', 'MOBILIZA']);
const PARTICIPATION_ROLES = new Set([
  'MEMBRO', 'COORDENACAO', 'VOLUNTARIADO', 'REPRESENTACAO', 'PARCEIRO'
]);
const PARTICIPATION_STATUSES = new Set(['ATIVA', 'ENCERRADA']);
const RESOURCE_CATEGORIES = new Set([
  'MATERIAL', 'EQUIPAMENTO', 'FINANCEIRO', 'ESPACO', 'SERVICO', 'OUTRO'
]);
const WORKSPACE_ROLES = new Set(['OWNER', 'ADMIN', 'COORDINATOR', 'MAPPER', 'MEMBER', 'VIEWER']);
const WORKSPACE_STATUSES = new Set(['ACTIVE', 'ARCHIVED']);
const WORKSPACE_MEMBER_STATUSES = new Set(['ACTIVE', 'INACTIVE']);
const ATTACHMENT_TYPES = new Set(['IMAGEM', 'ARQUIVO']);
const MEMORY_SYNC_STATUSES = new Set(['SERVER_RECORDED', 'SYNCED_FROM_OFFLINE']);

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

function optionalNullableText(value: unknown): value is string | null | undefined {
  return value === undefined || nullableText(value);
}

function nullableInteger(value: unknown): value is number | null {
  return value === null || integer(value);
}

function validDate(value: unknown): value is string {
  return presentText(value) && Number.isFinite(Date.parse(value));
}

function nullableDate(value: unknown): value is string | null {
  return value === null || validDate(value);
}

function optionalNullableDate(value: unknown): value is string | null | undefined {
  return value === undefined || nullableDate(value);
}

function optionalPositiveInteger(value: unknown): value is number | undefined {
  return value === undefined || integer(value);
}

function allowed(value: unknown, values: Set<string>): value is string {
  return typeof value === 'string' && values.has(value);
}

function latitude(value: unknown): value is number {
  return finite(value) && value >= -90 && value <= 90;
}

function longitude(value: unknown): value is number {
  return finite(value) && value >= -180 && value <= 180;
}

function coordinatePair(
  value: JsonRecord,
  latitudeKey = 'latitude',
  longitudeKey = 'longitude'
): boolean {
  const latitudeValue = value[latitudeKey];
  const longitudeValue = value[longitudeKey];
  const latitudeMissing = latitudeValue === null || latitudeValue === undefined;
  const longitudeMissing = longitudeValue === null || longitudeValue === undefined;
  return latitudeMissing === longitudeMissing
    && (latitudeMissing || (latitude(latitudeValue) && longitude(longitudeValue)));
}

function boundingBox(value: unknown): value is number[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true;
  if (value.length !== 4 || !value.every(finite)) return false;
  const [south, north, west, east] = value;
  return latitude(south) && latitude(north) && longitude(west) && longitude(east)
    && south <= north && west <= east;
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
    && validDate(value.createdAt);
}

function isObservacao(value: unknown, workspaceId: string): value is Observacao {
  return titledRecord(value, workspaceId)
    && presentText(value.categoria)
    && optionalNullableText(value.territorioId)
    && optionalNullableText(value.descricao)
    && optionalNullableText(value.localizacao)
    && optionalNullableText(value.bairro)
    && optionalNullableText(value.cidade)
    && optionalNullableText(value.estado)
    && optionalNullableText(value.urgencia)
    && optionalNullableText(value.autorId)
    && optionalNullableText(value.clientMutationId)
    && optionalNullableDate(value.occurredAt)
    && optionalNullableText(value.deviceId)
    && coordinatePair(value);
}

function isProblema(value: unknown, workspaceId: string): value is Problema {
  return titledRecord(value, workspaceId)
    && presentText(value.categoria)
    && nullableText(value.territorioId)
    && nullableText(value.descricao)
    && nullableText(value.localizacao)
    && nullableText(value.severidade)
    && nullableText(value.origemObservacaoId)
    && optionalNullableText(value.autorId)
    && coordinatePair(value);
}

function isPotentialidade(value: unknown, workspaceId: string): boolean {
  return titledRecord(value, workspaceId)
    && presentText(value.categoria)
    && nullableText(value.territorioId)
    && nullableText(value.descricao)
    && nullableText(value.localizacao)
    && nullableText(value.autorId)
    && coordinatePair(value);
}

function isMissao(value: unknown, workspaceId: string): value is MissaoRegistro {
  return titledRecord(value, workspaceId)
    && nullableText(value.territorioId)
    && nullableText(value.problemaId)
    && nullableText(value.responsavelId)
    && nullableText(value.descricao)
    && finite(value.progresso)
    && value.progresso >= 0
    && value.progresso <= 100;
}

function isAcao(value: unknown, workspaceId: string): value is Acao {
  return titledRecord(value, workspaceId)
    && nullableText(value.missaoId)
    && nullableText(value.responsavelId)
    && nullableText(value.descricao);
}

function isPessoa(value: unknown, workspaceId: string): value is PessoaHit {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && presentText(value.nome)
    && nullableText(value.papel)
    && nullableText(value.angicoId)
    && nullableText(value.telefone)
    && nullableText(value.foto)
    && validDate(value.createdAt);
}

function isEvidencia(value: unknown, workspaceId: string): value is Evidencia {
  if (!workspaceRecord(value, workspaceId)
    || !integer(value.id)
    || !allowed(value.subjectType, EVIDENCE_SUBJECT_TYPES)
    || !integer(value.subjectId)
    || !presentText(value.title)
    || !nullableText(value.description)
    || !nullableText(value.originalFilename)
    || !nullableText(value.contentType)
    || !(value.sizeBytes === null || (finite(value.sizeBytes) && value.sizeBytes >= 0))
    || !nullableText(value.sha256)
    || !validDate(value.capturedAt)
    || !validDate(value.recordedAt)
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
    && nullableText(value.descricao)
    && presentText(value.actorId)
    && validDate(value.occurredAt);
}

function isIndicador(value: unknown, workspaceId: string): value is Indicador {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && integer(value.territorioId)
    && presentText(value.nome)
    && nullableText(value.unidade)
    && nullableText(value.descricao)
    && presentText(value.status)
    && validDate(value.createdAt)
    && validDate(value.updatedAt);
}

function isMedicao(value: unknown, workspaceId: string): value is Medicao {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && integer(value.indicadorId)
    && finite(value.valor)
    && nullableText(value.unidade)
    && nullableText(value.fonte)
    && presentText(value.actorId)
    && validDate(value.measuredAt)
    && validDate(value.createdAt);
}

function isOrganizacao(value: unknown, workspaceId: string): value is Organizacao {
  if (!workspaceRecord(value, workspaceId)) return false;
  if (!integer(value.id)
    || !presentText(value.nome)
    || !allowed(value.tipo, ORGANIZATION_TYPES)
    || !presentText(value.status)
    || !nullableInteger(value.missaoId)
    || !(value.missionRelation === null || allowed(value.missionRelation, ORGANIZATION_MISSION_RELATIONS))
    || !presentText(value.actorId)
    || !validDate(value.createdAt)) return false;
  return (value.missaoId === null) === (value.missionRelation === null);
}

function isParticipacao(value: unknown, workspaceId: string): value is Participacao {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && integer(value.organizationId)
    && integer(value.pessoaId)
    && allowed(value.papel, PARTICIPATION_ROLES)
    && allowed(value.status, PARTICIPATION_STATUSES)
    && validDate(value.startedAt)
    && nullableDate(value.endedAt)
    && validDate(value.recordedAt)
    && presentText(value.actorId)
    && (value.status === 'ATIVA' ? value.endedAt === null : value.endedAt !== null);
}

function isRecurso(value: unknown, workspaceId: string): value is Recurso {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && presentText(value.nome)
    && allowed(value.categoria, RESOURCE_CATEGORIES)
    && presentText(value.unidade)
    && nullableText(value.descricao)
    && presentText(value.status)
    && presentText(value.actorId)
    && validDate(value.createdAt);
}

function isRecursoUso(value: unknown, workspaceId: string): value is RecursoUso {
  return workspaceRecord(value, workspaceId)
    && integer(value.id)
    && integer(value.recursoId)
    && integer(value.acaoId)
    && finite(value.quantidade)
    && value.quantidade > 0
    && presentText(value.unidade)
    && validDate(value.occurredAt)
    && validDate(value.recordedAt)
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
    && coordinatePair(entry, 'centerLatitude', 'centerLongitude')
    && (entry.status === undefined || allowed(entry.status, WORKSPACE_STATUSES))
    && optionalNullableText(entry.createdBy)
    && optionalNullableDate(entry.createdAt)
    && optionalNullableDate(entry.updatedAt)
  ));
}

export function isWorkspaceMemberList(value: unknown, workspaceId: string): value is WorkspaceMember[] {
  return list(value, (entry): entry is WorkspaceMember => (
    workspaceRecord(entry, workspaceId)
    && integer(entry.id)
    && presentText(entry.actorId)
    && presentText(entry.displayName)
    && allowed(entry.role, WORKSPACE_ROLES)
    && allowed(entry.status, WORKSPACE_MEMBER_STATUSES)
    && validDate(entry.joinedAt)
  ));
}

export function isDashboardData(value: unknown, workspaceId: string): value is DashboardData {
  if (!workspaceRecord(value, workspaceId) || !object(value.territory)
    || !presentText(value.territory.id) || !presentText(value.territory.name)
    || !text(value.territory.subtitle) || !presentText(value.memoryClaim)) return false;
  return list(value.stats, (item): item is DashboardData['stats'][number] => (
    object(item) && presentText(item.label) && (finite(item.value) || text(item.value))
    && optionalNullableText(item.trend) && allowed(item.icon, ICON_NAMES)
  )) && list(value.activities, (item): item is DashboardData['activities'][number] => (
    object(item) && presentText(item.title) && text(item.subtitle) && text(item.location)
    && presentText(item.time) && allowed(item.type, ICON_NAMES)
  )) && list(value.missions, (item): item is DashboardData['missions'][number] => (
    object(item) && presentText(item.title) && finite(item.progress)
    && item.progress >= 0 && item.progress <= 100 && text(item.actions) && presentText(item.status)
  )) && list(value.impact, (item): item is DashboardData['impact'][number] => (
    object(item) && presentText(item.value) && presentText(item.label)
    && text(item.period) && allowed(item.icon, ICON_NAMES)
  )) && list(value.categoryDistribution, (item): item is DashboardData['categoryDistribution'][number] => (
    object(item) && presentText(item.name) && finite(item.value) && item.value >= 0
  ));
}

export function isMapPointList(value: unknown, workspaceId: string): value is MapPoint[] {
  return list(value, (entry): entry is MapPoint => (
    workspaceRecord(entry, workspaceId)
    && ['observacao', 'problema', 'potencialidade'].includes(String(entry.type))
    && integer(entry.id)
    && presentText(entry.titulo)
    && presentText(entry.categoria)
    && presentText(entry.status)
    && latitude(entry.latitude)
    && longitude(entry.longitude)
  ));
}

export function isMemoriaEventList(value: unknown, workspaceId: string): value is MemoriaEvent[] {
  return list(value, (entry): entry is MemoriaEvent => (
    workspaceRecord(entry, workspaceId)
    && optionalPositiveInteger(entry.sequence)
    && optionalPositiveInteger(entry.commitSequence)
    && presentText(entry.entityType)
    && presentText(entry.entityId)
    && presentText(entry.eventType)
    && nullableText(entry.actorId)
    && validDate(entry.occurredAt)
    && optionalNullableDate(entry.recordedAt)
    && (entry.source === undefined || presentText(entry.source))
    && (entry.syncStatus === undefined || allowed(entry.syncStatus, MEMORY_SYNC_STATUSES))
    && optionalPositiveInteger(entry.entityVersion)
    && optionalNullableText(entry.deviceId)
    && (entry.payload === undefined || object(entry.payload))
  ));
}

export function isTerritorioList(value: unknown, workspaceId: string): value is Territorio[] {
  return list(value, (entry): entry is Territorio => (
    workspaceRecord(entry, workspaceId)
    && integer(entry.id)
    && presentText(entry.nome)
    && nullableText(entry.tipo)
    && nullableText(entry.cidade)
    && nullableText(entry.bairro)
    && nullableText(entry.estado)
    && nullableText(entry.pais)
    && coordinatePair(entry)
    && boundingBox(entry.boundingBox)
    && nullableText(entry.status)
    && nullableDate(entry.updatedAt)
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
    && coordinatePair(value)
    && nullableText(value.localDescricao)
    && isValidMessageLinkPair(value.linkedEntityType, value.linkedEntityId)
    && nullableText(value.clientMessageId)
    && nullableText(value.deviceId)
    && presentText(value.status)
    && validDate(value.occurredAt)
    && validDate(value.recordedAt)
    && validDate(value.createdAt)
    && list(value.anexos, (attachment): attachment is Mensagem['anexos'][number] => (
      object(attachment) && integer(attachment.id) && presentText(attachment.originalFilename)
      && presentText(attachment.contentType) && nonNegativeInteger(attachment.sizeBytes)
      && allowed(attachment.attachmentType, ATTACHMENT_TYPES) && validDate(attachment.createdAt)
    ))
    && Array.isArray(value.relacoes)
    && value.relacoes.every(presentText);
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
    && validDate(entry.createdAt)
    && validDate(entry.updatedAt)
    && nonNegativeInteger(entry.unreadCount)
    && list(entry.mensagens, (message): message is Mensagem => isMensagem(message, workspaceId, entry.id as number))
  ));
}

function reference(value: unknown): boolean {
  return object(value) && presentText(value.type) && presentText(value.id) && presentText(value.resource);
}

function stage(value: unknown): boolean {
  return object(value) && reference(value.reference) && presentText(value.name)
    && nullableText(value.status) && nullableDate(value.occurredAt)
    && nullableDate(value.recordedAt) && nullableText(value.syncStatus);
}

export function isRastroResponse(value: unknown, workspaceId: string): value is RastroResponse {
  return workspaceRecord(value, workspaceId)
    && stage(value.root)
    && Array.isArray(value.stages) && value.stages.every(stage)
    && Array.isArray(value.relations) && value.relations.every((entry) => (
      object(entry) && presentText(entry.type) && reference(entry.origin) && reference(entry.destination)
      && nullableText(entry.actorId) && nullableDate(entry.recordedAt)
    ))
    && Array.isArray(value.events) && value.events.every((entry) => (
      object(entry) && presentText(entry.id) && presentText(entry.type) && reference(entry.subject)
      && nullableText(entry.actorId) && nullableDate(entry.occurredAt)
      && nullableDate(entry.recordedAt) && nullableText(entry.syncStatus)
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
    && validDate(value.asOf);
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
