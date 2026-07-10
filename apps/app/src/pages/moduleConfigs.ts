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
  newLabel: string;
  path: string;
  accent: string;
  fields: FieldDef[];
  primary: (item: Record<string, unknown>) => string;
  badge?: (item: Record<string, unknown>) => string | undefined;
  meta: (item: Record<string, unknown>) => string[];
}

const CATEGORIAS = ['Resíduos', 'Água e Saneamento', 'Mobilidade', 'Áreas Verdes', 'Calor e Arborização', 'Segurança Alimentar', 'Outros'];
const URGENCIAS = ['BAIXA', 'MEDIA', 'ALTA'];
const s = (item: Record<string, unknown>, k: string) => (item[k] == null ? '' : String(item[k]));

export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  observacoes: {
    key: 'observacoes',
    title: 'Observações',
    subtitle: 'Registros do que acontece no território — o ponto de partida.',
    newLabel: 'Nova observação',
    path: '/api/observacoes',
    accent: '#2c8fbd',
    fields: [
      { name: 'categoria', label: 'Categoria', type: 'select', options: CATEGORIAS, required: true },
      { name: 'titulo', label: 'Título', type: 'text', required: true, placeholder: 'Ex: Descarte irregular de lixo' },
      { name: 'descricao', label: 'Descrição', type: 'textarea' },
      { name: 'localizacao', label: 'Localização', type: 'text', placeholder: 'Ex: Rua das Flores, 245' },
      { name: 'urgencia', label: 'Urgência', type: 'select', options: URGENCIAS }
    ],
    primary: (i) => s(i, 'titulo'),
    badge: (i) => s(i, 'urgencia') || undefined,
    meta: (i) => [s(i, 'categoria'), s(i, 'localizacao')].filter(Boolean)
  },
  problemas: {
    key: 'problemas',
    title: 'Problemas',
    subtitle: 'Situações validadas e priorizadas a partir das observações.',
    newLabel: 'Novo problema',
    path: '/api/problemas',
    accent: '#f97316',
    fields: [
      { name: 'categoria', label: 'Categoria', type: 'select', options: CATEGORIAS, required: true },
      { name: 'titulo', label: 'Título', type: 'text', required: true },
      { name: 'descricao', label: 'Descrição', type: 'textarea' },
      { name: 'localizacao', label: 'Localização', type: 'text' },
      { name: 'severidade', label: 'Severidade', type: 'select', options: URGENCIAS },
      { name: 'origemObservacaoId', label: 'ID da observação de origem', type: 'text', placeholder: 'opcional' }
    ],
    primary: (i) => s(i, 'titulo'),
    badge: (i) => s(i, 'severidade') || undefined,
    meta: (i) => [s(i, 'categoria'), s(i, 'status'), s(i, 'localizacao')].filter(Boolean)
  },
  missoes: {
    key: 'missoes',
    title: 'Missões',
    subtitle: 'Mobilização coletiva para responder aos problemas.',
    newLabel: 'Nova missão',
    path: '/api/missoes',
    accent: '#7c3aed',
    fields: [
      { name: 'titulo', label: 'Título', type: 'text', required: true },
      { name: 'descricao', label: 'Descrição', type: 'textarea' },
      { name: 'problemaId', label: 'ID do problema relacionado', type: 'text', placeholder: 'opcional' },
      { name: 'responsavelId', label: 'ID do responsável', type: 'text', placeholder: 'opcional' }
    ],
    primary: (i) => s(i, 'titulo'),
    badge: (i) => s(i, 'status') || undefined,
    meta: (i) => [`Progresso: ${s(i, 'progresso') || '0'}%`].filter(Boolean)
  },
  acoes: {
    key: 'acoes',
    title: 'Ações',
    subtitle: 'Passos concretos executados dentro das missões.',
    newLabel: 'Nova ação',
    path: '/api/acoes',
    accent: '#12a044',
    fields: [
      { name: 'titulo', label: 'Título', type: 'text', required: true },
      { name: 'descricao', label: 'Descrição', type: 'textarea' },
      { name: 'missaoId', label: 'ID da missão', type: 'text', placeholder: 'opcional' },
      { name: 'responsavelId', label: 'ID do responsável', type: 'text', placeholder: 'opcional' }
    ],
    primary: (i) => s(i, 'titulo'),
    badge: (i) => s(i, 'status') || undefined,
    meta: (i) => [s(i, 'descricao')].filter(Boolean)
  },
  potencialidades: {
    key: 'potencialidades',
    title: 'Potencialidades',
    subtitle: 'Recursos e potências do território que podem ser fortalecidos.',
    newLabel: 'Nova potencialidade',
    path: '/api/potencialidades',
    accent: '#2aa84a',
    fields: [
      { name: 'categoria', label: 'Categoria', type: 'select', options: ['Segurança Alimentar', 'Agricultura Urbana', 'Áreas Verdes', 'Educação Ambiental', 'Cultura e Arte', 'Saberes Tradicionais', 'Energia Renovável', 'Reciclagem e Compostagem', 'Turismo de Base Comunitária', 'Saúde Comunitária', 'Esporte e Lazer', 'Coletivos e Associações', 'Espaços Públicos', 'Outros'], required: true },
      { name: 'titulo', label: 'Título', type: 'text', required: true },
      { name: 'descricao', label: 'Descrição', type: 'textarea' },
      { name: 'localizacao', label: 'Localização', type: 'text' }
    ],
    primary: (i) => s(i, 'titulo'),
    badge: (i) => s(i, 'status') || undefined,
    meta: (i) => [s(i, 'categoria'), s(i, 'localizacao')].filter(Boolean)
  },
  pessoas: {
    key: 'pessoas',
    title: 'Pessoas e Grupos',
    subtitle: 'Os agentes de inteligência territorial.',
    newLabel: 'Nova pessoa',
    path: '/api/pessoas',
    accent: '#004B6C',
    fields: [
      { name: 'angicoId', label: 'Angico ID', type: 'angico-search', placeholder: 'Buscar por nome ou @id…' },
      { name: 'nome', label: 'Nome', type: 'text', required: true },
      { name: 'papel', label: 'Papel', type: 'text', placeholder: 'Ex: Jovem Mapeador, Mentor' }
    ],
    primary: (i) => s(i, 'nome'),
    badge: (i) => s(i, 'papel') || undefined,
    meta: (i) => [s(i, 'angicoId') ? `@${s(i, 'angicoId')}` : 'sem Angico ID']
  }
};
