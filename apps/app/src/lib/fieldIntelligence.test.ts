import { describe, expect, it } from 'vitest';
import { suggestCategory } from './fieldIntelligence';

describe('field intelligence', () => {
  it.each([
    ['Sacos de lixo e entulho acumulados na esquina', 'Resíduos'],
    ['Esgoto vazando perto do rio e água contaminada', 'Água e Saneamento'],
    ['Calçada quebrada dificulta a passagem dos pedestres', 'Mobilidade'],
    ['Jardim e praça precisam de manutenção', 'Áreas Verdes'],
    ['Muito calor na rua sem sombra e sem árvores', 'Calor e Arborização'],
    ['Derrubada de árvores na mata nativa', 'Desmatamento'],
    ['Fumaça e fogo se espalhando pela vegetação', 'Queimadas'],
    ['Aves e animais silvestres encontrados feridos', 'Biodiversidade'],
    ['Famílias sem alimentos e sem acesso a refeições', 'Segurança Alimentar']
  ])('suggests a category for a held-out report: %s', (text, category) => {
    expect(suggestCategory(text)?.category).toBe(category);
  });

  it.each(['', 'Olá', 'lixo', 'A reunião da equipe foi marcada para amanhã', 'Comprar computador e instalar teclado novo'])('abstains on insufficient or unrelated input: %s', (text) => {
    expect(suggestCategory(text)).toBeNull();
  });

  it('treats negated reports as topics, without inferring risk or urgency', () => {
    const result = suggestCategory('Não há fogo nem fumaça na vegetação');
    expect(result?.category).toBe('Queimadas');
    expect(result).not.toHaveProperty('urgency');
    expect(result).not.toHaveProperty('probability');
  });

  it('explains a suggestion using terms actually present in the report', () => {
    const result = suggestCategory('ESGOTO vazando com ÁGUA contaminada');
    expect(result?.terms).toContain('esgoto');
    expect(result?.terms.every((term) => ['esgoto', 'vazando', 'agua', 'contaminada'].includes(term))).toBe(true);
  });
});
