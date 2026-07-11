export interface Territory {
  id: string;
  name: string;
  subtitle: string;
}

export interface Stat {
  label: string;
  value: number | string;
  trend?: string;
  icon: IconName;
}

export interface Activity {
  title: string;
  subtitle: string;
  location: string;
  time: string;
  type: IconName;
}

export interface Mission {
  title: string;
  progress: number;
  actions: string;
  status: string;
}

export interface ImpactItem {
  value: string;
  label: string;
  period: string;
  icon: IconName;
}

export interface CategorySlice {
  name: string;
  value: number;
}

export interface DashboardData {
  workspaceId: string;
  territory: Territory;
  stats: Stat[];
  activities: Activity[];
  missions: Mission[];
  impact: ImpactItem[];
  categoryDistribution: CategorySlice[];
  memoryClaim: string;
}

export interface ObservacaoInput {
  workspaceId: string;
  territorioId?: string;
  categoria: string;
  titulo: string;
  descricao?: string;
  localizacao?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  urgencia?: string;
  autorId?: string;
  latitude?: number;
  longitude?: number;
  clientMutationId?: string;
  occurredAt?: string;
  deviceId?: string;
}

export interface Observacao extends ObservacaoInput {
  id: number;
  status: string;
  createdAt: string;
}

export interface ProblemaInput {
  workspaceId: string;
  territorioId: string;
  categoria: string;
  titulo: string;
  descricao?: string;
  localizacao?: string;
  latitude?: number;
  longitude?: number;
  severidade?: string;
  origemObservacaoId?: string;
}

export interface Problema {
  id: number;
  workspaceId: string;
  territorioId: string | null;
  categoria: string;
  titulo: string;
  descricao: string | null;
  localizacao: string | null;
  latitude: number | null;
  longitude: number | null;
  severidade: string | null;
  origemObservacaoId: string | null;
  status: string;
  createdAt: string;
  autorId?: string | null;
}

export interface MissaoInput {
  workspaceId: string;
  territorioId: string;
  problemaId: string;
  responsavelId: string;
  titulo: string;
  descricao?: string;
}

export interface MissaoRegistro {
  id: number;
  workspaceId: string;
  territorioId: string | null;
  problemaId: string | null;
  responsavelId: string | null;
  titulo: string;
  descricao: string | null;
  status: string;
  progresso: number;
  createdAt: string;
}

export interface AcaoInput {
  workspaceId: string;
  missaoId: string;
  responsavelId: string;
  titulo: string;
  descricao?: string;
}

export interface Acao {
  id: number;
  workspaceId: string;
  missaoId: string | null;
  responsavelId: string | null;
  titulo: string;
  descricao: string | null;
  status: string;
  createdAt: string;
}

export type EvidenceSubjectType = 'OBSERVACAO' | 'ACAO' | 'RESULTADO';

export interface EvidenciaInput {
  workspaceId: string;
  subjectType: EvidenceSubjectType;
  subjectId: number;
  title: string;
  description?: string;
  capturedAt?: string;
  deviceId?: string;
  clientMutationId?: string;
  file?: File;
}

export interface Evidencia {
  id: number;
  workspaceId: string;
  subjectType: EvidenceSubjectType;
  subjectId: number;
  title: string;
  description: string | null;
  originalFilename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  capturedAt: string;
  recordedAt: string;
  actorId: string;
  deviceId: string | null;
  clientMutationId: string | null;
  hasFile: boolean;
}

export interface ResultadoInput {
  workspaceId: string;
  acaoId: number;
  titulo: string;
  descricao?: string;
  occurredAt?: string;
}

export interface Resultado {
  id: number;
  workspaceId: string;
  acaoId: number;
  titulo: string;
  descricao: string | null;
  status: string;
  actorId: string;
  occurredAt: string;
  createdAt: string;
}

export interface IndicadorInput {
  workspaceId: string;
  territorioId: number;
  resultadoId?: number;
  nome: string;
  unidade?: string;
  descricao?: string;
}

export interface Indicador {
  id: number;
  workspaceId: string;
  territorioId: number;
  nome: string;
  unidade: string | null;
  descricao: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicaoInput {
  workspaceId: string;
  indicadorId: number;
  valor: number;
  unidade?: string;
  fonte?: string;
  measuredAt?: string;
}

export interface Medicao {
  id: number;
  workspaceId: string;
  indicadorId: number;
  valor: number;
  unidade: string | null;
  fonte: string | null;
  actorId: string;
  measuredAt: string;
  createdAt: string;
}

export type OrganizacaoTipo =
  | 'COLETIVO' | 'ASSOCIACAO' | 'ONG' | 'COOPERATIVA' | 'ESCOLA'
  | 'PODER_PUBLICO' | 'EMPRESA' | 'OUTRA';

export type OrganizationMissionRelation = 'CONDUZ' | 'MOBILIZA';

export interface OrganizacaoInput {
  workspaceId: string;
  nome: string;
  tipo: OrganizacaoTipo;
  missaoId?: number;
  missionRelation?: OrganizationMissionRelation;
}

export interface Organizacao {
  id: number;
  workspaceId: string;
  nome: string;
  tipo: OrganizacaoTipo;
  status: string;
  missaoId: number | null;
  missionRelation: OrganizationMissionRelation | null;
  actorId: string;
  createdAt: string;
}

export type ParticipacaoPapel =
  | 'MEMBRO' | 'COORDENACAO' | 'VOLUNTARIADO' | 'REPRESENTACAO' | 'PARCEIRO';

export interface ParticipacaoInput {
  workspaceId: string;
  pessoaId: number;
  papel: ParticipacaoPapel;
  status: 'ATIVA';
  startedAt: string;
  endedAt?: string | null;
}

export interface Participacao {
  id: number;
  workspaceId: string;
  organizationId: number;
  pessoaId: number;
  papel: ParticipacaoPapel;
  status: string;
  startedAt: string;
  endedAt: string | null;
  recordedAt: string;
  actorId: string;
}

export type RecursoCategoria =
  | 'MATERIAL' | 'EQUIPAMENTO' | 'FINANCEIRO' | 'ESPACO' | 'SERVICO' | 'OUTRO';

export interface RecursoInput {
  workspaceId: string;
  nome: string;
  categoria: RecursoCategoria;
  unidade: string;
  descricao?: string;
}

export interface Recurso {
  id: number;
  workspaceId: string;
  nome: string;
  categoria: RecursoCategoria;
  unidade: string;
  descricao: string | null;
  status: string;
  actorId: string;
  createdAt: string;
}

export interface RecursoUsoInput {
  workspaceId: string;
  acaoId: number;
  quantidade: number;
  unidade: string;
  occurredAt?: string;
}

export interface RecursoUso {
  id: number;
  workspaceId: string;
  recursoId: number;
  acaoId: number;
  quantidade: number;
  unidade: string;
  occurredAt: string;
  recordedAt: string;
  actorId: string;
}

export interface MapPoint {
  workspaceId: string;
  type: 'observacao' | 'problema' | 'potencialidade';
  id: number;
  titulo: string;
  categoria: string;
  status: string;
  latitude: number;
  longitude: number;
}

export interface GeoResult {
  displayName: string;
  city: string | null;
  neighborhood: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  boundingBox: number[];
}

export interface GeoSearchResponse {
  query: string;
  results: GeoResult[];
  error?: string | null;
}

export interface PessoaHit {
  id: number;
  workspaceId: string;
  nome: string;
  papel: string | null;
  angicoId: string | null;
  telefone: string | null;
  foto: string | null;
  createdAt: string;
}

export interface MensagemAnexo {
  id: number;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  attachmentType: string;
  createdAt: string;
}

export interface Mensagem {
  id: number;
  workspaceId: string;
  conversaId: number;
  senderPessoaId: number | null;
  senderNome: string | null;
  corpo: string;
  latitude: number | null;
  longitude: number | null;
  localDescricao: string | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  clientMessageId: string | null;
  deviceId: string | null;
  status: string;
  occurredAt: string;
  recordedAt: string;
  createdAt: string;
  anexos: MensagemAnexo[];
  relacoes: string[];
}

export interface Conversa {
  id: number;
  workspaceId: string;
  territorioId: number | null;
  contextEntityType: string;
  contextEntityId: string;
  titulo: string;
  createdByPessoaId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  mensagens: Mensagem[];
}

export interface MensagemBusca {
  conversaId: number;
  titulo: string;
  contextEntityType: string;
  contextEntityId: string;
  mensagemId: number | null;
  corpo: string | null;
  senderNome: string | null;
  occurredAt: string | null;
}

export interface Territorio {
  id: number;
  workspaceId: string;
  nome: string;
  tipo: string | null;
  cidade: string | null;
  bairro: string | null;
  estado: string | null;
  pais: string | null;
  latitude: number | null;
  longitude: number | null;
  boundingBox: number[];
  status: string | null;
  updatedAt: string | null;
}

export interface TerritorioInput {
  workspaceId: string;
  nome: string;
  tipo: string;
  cidade: string | null;
  bairro: string | null;
  estado: string | null;
  pais: string | null;
  latitude: number | null;
  longitude: number | null;
  boundingBox: number[] | null;
}

export type RastroRootType = 'TERRITORIO' | 'MISSAO' | 'ACAO';

export interface RastroReference {
  type: string;
  id: string;
  resource: string;
}

export interface RastroStage {
  reference: RastroReference;
  name: string;
  status: string | null;
  occurredAt: string | null;
  recordedAt: string | null;
  syncStatus: string | null;
}

export interface RastroRelation {
  type: string;
  origin: RastroReference;
  destination: RastroReference;
  actorId: string | null;
  recordedAt: string | null;
}

export interface RastroEvent {
  id: string;
  type: string;
  subject: RastroReference;
  actorId: string | null;
  occurredAt: string | null;
  recordedAt: string | null;
  syncStatus: string | null;
}

export interface RastroParticipant {
  participant: RastroReference;
  name: string;
  status: string | null;
  relationType: string;
  at: RastroReference;
}

export interface RastroExpectedRelation {
  originType: string;
  relationType: string;
  destinationType: string;
}

export interface RastroGap {
  code: string;
  subject: RastroReference;
  reason: string;
  nextAction: string;
  expectedRelation: RastroExpectedRelation | null;
}

export interface RastroResponse {
  workspaceId: string;
  root: RastroStage;
  stages: RastroStage[];
  relations: RastroRelation[];
  events: RastroEvent[];
  participants: RastroParticipant[];
  gaps: RastroGap[];
  limits: {
    maxNodes: number;
    maxRelations: number;
    maxEvents: number;
    truncated: boolean;
  };
  asOf: string;
}

export interface Workspace {
  slug: string;
  nome: string;
  descricao?: string | null;
  cidade?: string | null;
  estado?: string | null;
  centerLatitude?: number | null;
  centerLongitude?: number | null;
  status?: string;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceMember {
  id: number;
  workspaceId: string;
  actorId: string;
  displayName: string;
  role: string;
  status: string;
  joinedAt: string;
}

export interface MemoriaEvent {
  workspaceId: string;
  sequence?: number;
  commitSequence?: number;
  entityType: string;
  entityId: string;
  eventType: string;
  actorId: string | null;
  occurredAt: string;
  recordedAt?: string;
  source?: string;
  syncStatus?: string;
  entityVersion?: number;
  deviceId?: string;
  payload?: Record<string, unknown>;
}

export type IconName =
  | 'leaf' | 'warning' | 'target' | 'people' | 'sprout' | 'map'
  | 'observation' | 'mission' | 'action' | 'indicator' | 'memory'
  | 'report' | 'trash' | 'tree' | 'check' | 'search' | 'bell'
  | 'cloud' | 'help' | 'exit' | 'message';
