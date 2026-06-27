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
  trend: string;
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
  urgencia?: string;
  autorId?: string;
  latitude?: number;
  longitude?: number;
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
  | 'cloud' | 'help' | 'exit';
