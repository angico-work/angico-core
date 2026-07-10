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
  participants: string;
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

export interface MapPoint {
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
  status: string;
  createdAt: string;
  anexos: MensagemAnexo[];
  relacoes: string[];
}

export interface Conversa {
  id: number;
  workspaceId: string;
  territorioId: number | null;
  titulo: string;
  createdByPessoaId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  mensagens: Mensagem[];
}

export interface Territorio {
  id: number;
  workspaceId: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  status: string | null;
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
