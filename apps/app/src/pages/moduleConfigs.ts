export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'angico-search';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface ModuleConfig {
  key: string;
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyMessage: string;
  newLabel: string;
  singular: string;
  path: string;
  accent: string;
  fields: FieldDef[];
  primary: (item: Record<string, unknown>) => string;
  badge?: (item: Record<string, unknown>) => string | undefined;
  meta: (item: Record<string, unknown>) => string[];
}

const CATEGORIES = ['Resíduos', 'Água e Saneamento', 'Mobilidade', 'Áreas Verdes', 'Calor e Arborização', 'Segurança Alimentar', 'Outros'];
const PRIORITIES = ['BAIXA', 'MEDIA', 'ALTA'];
const value = (item: Record<string, unknown>, key: string) => item[key] == null ? '' : String(item[key]);

export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  observacoes: {
    key: 'observacoes', title: 'Observações', singular: 'Observação', newLabel: 'Registrar observação',
    subtitle: 'Relatos de campo que iniciam a memória do território.',
    emptyTitle: 'Nenhuma observação registrada', emptyMessage: 'Registre o que aconteceu, mesmo sem conexão.',
    path: '/api/observacoes', accent: '#34ABA6', fields: [],
    primary: (item) => value(item, 'titulo'), badge: (item) => value(item, 'urgencia') || value(item, 'status') || undefined,
    meta: (item) => [value(item, 'categoria'), value(item, 'localizacao')].filter(Boolean)
  },
  problemas: {
    key: 'problemas', title: 'Problemas', singular: 'Problema', newLabel: 'Registrar problema',
    subtitle: 'Situações reconhecidas que exigem resposta organizada.',
    emptyTitle: 'Nenhum problema reconhecido', emptyMessage: 'Valide uma situação observada antes de mobilizar uma resposta.',
    path: '/api/problemas', accent: '#004B6C',
    fields: [
      { name: 'categoria', label: 'Categoria', type: 'select', options: CATEGORIES, required: true },
      { name: 'titulo', label: 'Situação reconhecida', type: 'text', required: true },
      { name: 'descricao', label: 'Contexto', type: 'textarea' },
      { name: 'localizacao', label: 'Local', type: 'text' },
      { name: 'severidade', label: 'Severidade', type: 'select', options: PRIORITIES }
    ],
    primary: (item) => value(item, 'titulo'), badge: (item) => value(item, 'severidade') || value(item, 'status') || undefined,
    meta: (item) => [value(item, 'categoria'), value(item, 'localizacao')].filter(Boolean)
  },
  potencialidades: {
    key: 'potencialidades', title: 'Potencialidades', singular: 'Potencialidade', newLabel: 'Registrar potencialidade',
    subtitle: 'Recursos, saberes e capacidades que o território já possui.',
    emptyTitle: 'Nenhuma potencialidade registrada', emptyMessage: 'Reconheça um recurso ou saber que pode fortalecer novas ações.',
    path: '/api/potencialidades', accent: '#003952',
    fields: [
      { name: 'categoria', label: 'Categoria', type: 'select', options: ['Agricultura Urbana', 'Educação Ambiental', 'Cultura e Arte', 'Saberes Tradicionais', 'Reciclagem e Compostagem', 'Saúde Comunitária', 'Coletivos e Associações', 'Espaços Públicos', 'Outros'], required: true },
      { name: 'titulo', label: 'Potencialidade', type: 'text', required: true },
      { name: 'descricao', label: 'Como pode contribuir', type: 'textarea' },
      { name: 'localizacao', label: 'Local', type: 'text' }
    ],
    primary: (item) => value(item, 'titulo'), badge: (item) => value(item, 'status') || undefined,
    meta: (item) => [value(item, 'categoria'), value(item, 'localizacao')].filter(Boolean)
  },
  missoes: {
    key: 'missoes', title: 'Missões', singular: 'Missão', newLabel: 'Criar missão',
    subtitle: 'Compromissos coletivos que organizam uma resposta no tempo.',
    emptyTitle: 'Nenhuma missão em curso', emptyMessage: 'Crie uma missão quando houver um problema e uma resposta possível.',
    path: '/api/missoes', accent: '#004B6C',
    fields: [],
    primary: (item) => value(item, 'titulo'), badge: (item) => value(item, 'status') || undefined,
    meta: (item) => [`Progresso ${value(item, 'progresso') || '0'}%`, value(item, 'descricao')].filter(Boolean)
  },
  acoes: {
    key: 'acoes', title: 'Ações', singular: 'Ação', newLabel: 'Registrar ação',
    subtitle: 'Trabalho realizado por pessoas, organizações e comunidades.',
    emptyTitle: 'Nenhuma ação registrada', emptyMessage: 'Registre uma ação executada para preservar autoria e continuidade.',
    path: '/api/acoes', accent: '#34ABA6',
    fields: [],
    primary: (item) => value(item, 'titulo'), badge: (item) => value(item, 'status') || undefined,
    meta: (item) => [value(item, 'descricao')].filter(Boolean)
  },
  pessoas: {
    key: 'pessoas', title: 'Pessoas e grupos', singular: 'Participante', newLabel: 'Adicionar participante',
    subtitle: 'Quem torna o trabalho possível e forma a trajetória coletiva.',
    emptyTitle: 'Nenhuma participação registrada', emptyMessage: 'Adicione uma pessoa pelo nome ou identidade Angico.',
    path: '/api/pessoas', accent: '#34ABA6',
    fields: [
      { name: 'angicoId', label: 'Identidade Angico', type: 'angico-search', placeholder: 'Buscar por nome ou @identidade' },
      { name: 'nome', label: 'Nome', type: 'text', required: true },
      { name: 'papel', label: 'Papel no território', type: 'text', placeholder: 'Ex.: mobilizadora, educador, cooperativa' }
    ],
    primary: (item) => value(item, 'nome'), badge: (item) => value(item, 'papel') || undefined,
    meta: (item) => [value(item, 'angicoId') ? `@${value(item, 'angicoId')}` : 'Identidade ainda não vinculada']
  }
};
