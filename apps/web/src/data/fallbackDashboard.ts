import type { DashboardData } from '../types';

// Demo data rendered when the API is unreachable or the glimpse endpoint
// is not yet implemented. Keep in sync with the real payload shape.
export const fallbackDashboard: DashboardData = {
  workspaceId: 'coletivo-jardim-novo',
  territory: {
    id: 'bairro-jardim-novo',
    name: 'Bairro Jardim Novo',
    subtitle: 'Visão geral socioambiental do território'
  },
  stats: [
    { label: 'Observações', value: 128, trend: '+12 esta semana', icon: 'leaf' },
    { label: 'Problemas Ativos', value: 23, trend: '+3 novos', icon: 'warning' },
    { label: 'Missões em Andamento', value: 8, trend: '2 concluídas', icon: 'target' },
    { label: 'Jovens Engajados', value: 156, trend: '+8 este mês', icon: 'people' },
    { label: 'Potencialidades', value: 17, trend: '+2 identificadas', icon: 'sprout' }
  ],
  activities: [
    { title: 'Novo problema identificado', subtitle: 'Descarte irregular de lixo', location: 'Rua das Flores, 245', time: 'Há 2 horas', type: 'warning' },
    { title: 'Nova observação', subtitle: 'Alagamento após chuva forte', location: 'Praça Central', time: 'Há 3 horas', type: 'target' },
    { title: 'Missão concluída', subtitle: 'Mutirão de limpeza do Córrego Azul', location: 'Impacto: 320kg de resíduos removidos', time: 'Há 1 dia', type: 'check' },
    { title: 'Novo jovem engajado', subtitle: 'Pedro Henrique se juntou ao coletivo', location: '', time: 'Há 1 dia', type: 'people' },
    { title: 'Nova potencialidade', subtitle: 'Horta comunitária', location: 'Escola Municipal Jardim Novo', time: 'Há 2 dias', type: 'sprout' }
  ],
  missions: [
    { title: 'Revitalizar Praça Central', progress: 60, actions: '5 ações', participants: '12 participantes' },
    { title: 'Córrego Azul Limpo', progress: 40, actions: '3 ações', participants: '8 participantes' },
    { title: 'Arborização do Bairro', progress: 25, actions: '4 ações', participants: '15 participantes' }
  ],
  impact: [
    { value: '1.2 ton', label: 'Resíduos removidos', period: 'este mês', icon: 'trash' },
    { value: '45', label: 'Árvores plantadas', period: 'este mês', icon: 'tree' },
    { value: '320', label: 'Pessoas impactadas', period: 'este mês', icon: 'people' },
    { value: '12', label: 'Ações realizadas', period: 'este mês', icon: 'check' }
  ],
  categoryDistribution: [
    { name: 'Resíduos', value: 8 },
    { name: 'Água e Saneamento', value: 6 },
    { name: 'Mobilidade', value: 4 },
    { name: 'Áreas Verdes', value: 3 },
    { name: 'Outros', value: 2 }
  ],
  memoryClaim: 'Cada dado do painel possui caminho para objeto, relação e evento no core do Angico.'
};
