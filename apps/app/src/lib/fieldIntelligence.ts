/** Experimental, fixed training set authored for this prototype; no user records. */
const examples: Record<string, string[]> = {
  'Resíduos': [
    'Lixo e entulho acumulados na rua com descarte irregular de resíduos',
    'Sacos plásticos garrafas e embalagens abandonados perto das casas',
    'Coleta de lixo atrasada e lixeira cheia de resíduos domésticos',
    'Pneus móveis e restos de construção descartados no terreno'
  ],
  'Água e Saneamento': [
    'Esgoto vazando na rua com mau cheiro e água contaminada',
    'Rio e córrego poluídos pelo despejo de esgoto sem tratamento',
    'Falta de água nas casas e vazamento na rede de abastecimento',
    'Alagamento após chuva com bueiro entupido e drenagem insuficiente'
  ],
  'Mobilidade': [
    'Calçada quebrada bloqueia passagem dos pedestres e cadeirantes',
    'Ciclovia interrompida e travessia sem faixa de pedestres',
    'Ônibus atrasado e ponto de transporte sem acessibilidade',
    'Buracos na via e trânsito perigoso para bicicletas e pedestres'
  ],
  'Áreas Verdes': [
    'Praça e jardim precisam de manutenção e cuidado com canteiros',
    'Parque abandonado com gramado e plantas sem manutenção',
    'Recuperação de área verde com plantio no jardim comunitário',
    'Canteiros da praça danificados e parque sem conservação'
  ],
  'Calor e Arborização': [
    'Calor intenso na rua sem sombra e sem árvores',
    'Falta arborização nas calçadas e temperatura alta no bairro',
    'Ponto de ônibus exposto ao sol e desconforto térmico',
    'Ilha de calor com asfalto quente e poucas árvores para sombra'
  ],
  'Desmatamento': [
    'Derrubada de árvores e retirada de mata nativa',
    'Corte ilegal de vegetação na floresta e abertura de clareira',
    'Desmatamento avança sobre mata ciliar e reserva florestal',
    'Troncos cortados e perda de cobertura vegetal na floresta'
  ],
  'Queimadas': [
    'Fogo e fumaça na vegetação com incêndio se espalhando',
    'Queimada em terreno seco e chamas perto das casas',
    'Incêndio florestal com fumaça intensa e cheiro de queimado',
    'Vegetação queimada e cinzas após fogo no mato'
  ],
  'Biodiversidade': [
    'Aves e animais silvestres feridos perto da estrada',
    'Peixes mortos no rio e perda de espécies aquáticas',
    'Abelhas e polinizadores desaparecendo da região',
    'Fauna ameaçada e habitat de animais silvestres fragmentado'
  ],
  'Segurança Alimentar': [
    'Famílias sem alimentos e sem acesso a refeições adequadas',
    'Fome e insegurança alimentar com falta de comida em casa',
    'Alimentos frescos inacessíveis e dificuldade de acesso à alimentação',
    'Cozinha comunitária precisa de alimentos para distribuir refeições'
  ]
};

const stopWords = new Set('a o as os um uma uns umas de da do das dos em no na nos nas e ou com sem para por pelo pela ao aos que se sua seu suas seus foi ha nao muito mais perto sobre apos precisa precisam acesso falta'.split(' '));
function tokens(text: string): string[] {
  return (text.slice(0, 8000).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z]{3,}/g) ?? [])
    .filter((token) => !stopWords.has(token));
}

type Vector = Map<string, number>;
function normalize(vector: Vector): Vector {
  const norm = Math.hypot(...vector.values());
  return new Map([...vector].map(([term, value]) => [term, norm ? value / norm : 0]));
}

// TF-IDF nearest-centroid classifier (Rocchio). Learn weights from the labeled
// examples once, lazily, so opening a page does not train a model or fetch data.
function train() {
  const documents = Object.entries(examples).flatMap(([category, texts]) => texts.map((text) => ({ category, terms: tokens(text) })));
  const frequencies = new Map<string, number>();
  for (const document of documents) {
    for (const term of new Set(document.terms)) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  }
  const idf = new Map([...frequencies].map(([term, count]) => [term, Math.log((1 + documents.length) / (1 + count)) + 1]));
  function vectorize(terms: string[]): Vector {
    const counts: Vector = new Map();
    for (const term of terms) if (idf.has(term)) counts.set(term, (counts.get(term) ?? 0) + 1);
    return normalize(new Map([...counts].map(([term, count]) => [term, (1 + Math.log(count)) * idf.get(term)!])));
  }
  const sums = new Map<string, Vector>();
  for (const document of documents) {
    const sum = sums.get(document.category) ?? new Map<string, number>();
    for (const [term, weight] of vectorize(document.terms)) sum.set(term, (sum.get(term) ?? 0) + weight);
    sums.set(document.category, sum);
  }
  return { vectorize, centroids: [...sums].map(([category, sum]) => ({ category, vector: normalize(sum) })) };
}

export interface CategorySuggestion { category: string; terms: string[] }
let model: ReturnType<typeof train> | undefined;

/** Similarity is an internal ranking score, not a calibrated probability. */
export function suggestCategory(text: string): CategorySuggestion | null {
  model ??= train();
  const vector = model.vectorize(tokens(text));
  if (vector.size < 2) return null;
  const ranked = model.centroids.map(({ category, vector: centroid }) => {
    const terms = [...vector].map(([term, weight]) => ({ term, contribution: weight * (centroid.get(term) ?? 0) }))
      .filter(({ contribution }) => contribution > 0).sort((a, b) => b.contribution - a.contribution);
    return { category, terms, score: terms.reduce((sum, term) => sum + term.contribution, 0) };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (best.terms.length < 2 || best.score < 0.25 || best.score - ranked[1].score < 0.08) return null;
  return { category: best.category, terms: best.terms.slice(0, 4).map(({ term }) => term) };
}
