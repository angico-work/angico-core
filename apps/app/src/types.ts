// Shape of the territory dashboard payload served by GET /api/glimpse/dashboard.
// Mirrored on the API side once the `glimpse` aggregation endpoint exists.

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

// Payload for POST /api/observacoes
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

// Response from the observações endpoints
export interface Observacao extends ObservacaoInput {
  id: number;
  status: string;
  createdAt: string;
}

// Geolocated objeto for the map (GET /api/glimpse/map)
export interface MapPoint {
  type: 'observacao' | 'problema' | 'potencialidade';
  id: number;
  titulo: string;
  categoria: string;
  status: string;
  latitude: number;
  longitude: number;
}

// A geocoding match from GET /api/geocoding/search (Nominatim + IBGE fallback).
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

// A person match from GET /api/pessoas/search — used to link a real Angico
// identity to a território member via the "Nova pessoa" autocomplete.
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

// --- Mensagens & grupos (GET/POST /api/mensagens) ---------------------------
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

// A named workspace (GET/POST /api/workspaces). The `slug` is the partition key
// every module scopes by; the `nome` is what members see in the switcher. The
// remaining fields are optional metadata about the place and lifecycle.
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

// A person's membership in a workspace, with a role that drives access control.
export interface WorkspaceMember {
  id: number;
  workspaceId: string;
  actorId: string;
  displayName: string;
  role: string;
  status: string;
  joinedAt: string;
}

// One row of the território memory timeline (GET /api/glimpse/memoria)
export interface MemoriaEvent {
  sequence: number;
  entityType: string;
  entityId: string;
  eventType: string;
  actorId: string | null;
  occurredAt: string;
}

export type IconName =
  | 'leaf' | 'warning' | 'target' | 'people' | 'sprout' | 'map'
  | 'observation' | 'mission' | 'action' | 'indicator' | 'memory'
  | 'report' | 'trash' | 'tree' | 'check' | 'search' | 'bell'
  | 'cloud' | 'help' | 'exit' | 'message';
