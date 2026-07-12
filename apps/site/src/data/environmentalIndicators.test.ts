import { describe, expect, it } from 'vitest';
import {
  ENVIRONMENTAL_CONTEXT_BOUNDARY,
  ENVIRONMENTAL_INDICATORS_UPDATED_LABEL,
  environmentalIndicators
} from './environmentalIndicators';

describe('environmentalIndicators', () => {
  it('versions values, periods, caveats and sources as one evidence snapshot', () => {
    expect(ENVIRONMENTAL_INDICATORS_UPDATED_LABEL).toBe('Atualizado em julho de 2026');
    expect(ENVIRONMENTAL_CONTEXT_BOUNDARY).toBe(
      'Contexto ambiental público. Estes números não representam resultados produzidos pelo Angico.'
    );

    expect(environmentalIndicators).toEqual([
      {
        id: 'displacement',
        title: 'Exílio climático',
        code: 'DESLOCAMENTO / RS / 2024',
        value: '775 mil',
        unit: 'deslocamentos internos',
        statement:
          'As enchentes no Rio Grande do Sul provocaram cerca de 775 mil deslocamentos em 2024.',
        localSignal: 'abrigos, rotas interrompidas e famílias obrigadas a sair.',
        geography: 'Rio Grande do Sul',
        period: '2024',
        caveat: '“Deslocamentos” contabiliza movimentos, não necessariamente pessoas únicas.',
        sources: [
          {
            label: 'IDMC — Global Report on Internal Displacement 2025',
            url: 'https://www.internal-displacement.org/spotlights/brazil-floods-in-rio-grande-do-sul-trigger-record-displacement/'
          }
        ]
      },
      {
        id: 'drought',
        title: 'El Niño e seca',
        code: 'SECA / BRASIL / 2023–2024',
        value: '60%',
        unit: 'do território brasileiro',
        statement:
          'Entre 2023 e 2024, uma seca extensa e intensa atingiu cerca de 60% do Brasil. O Cemaden registra que o episódio se intensificou sob influência do El Niño e do aquecimento do Atlântico Tropical Norte.',
        localSignal: 'falta de água, solo seco, calor e áreas produtivas sob pressão.',
        geography: 'Brasil',
        period: '2023–2024',
        caveat:
          'Os 60% não são atribuídos exclusivamente ao El Niño; o Cemaden também aponta o aquecimento do Atlântico Tropical Norte.',
        sources: [
          {
            label: 'Cemaden/MCTI — extensão da seca em 2023–2024',
            url: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/entre-2023-e-2024-cerca-de-60-do-territorio-brasileiro-foi-afetado-seca-extensa-e-intensa-aponta-nota-tecnica-do-cemaden'
          },
          {
            label: 'Cemaden/MCTI — diagnóstico das secas e condicionantes climáticos',
            url: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/cemaden-analisa-secas-recentes-no-brasil-e-apresenta-diagnostico-e-projecoes-como-subsidio-para-a-cop-16'
          }
        ]
      },
      {
        id: 'shade',
        title: 'Calor sem sombra',
        code: 'ARBORIZAÇÃO / BRASIL URBANO / CENSO 2022',
        value: '58,7 mi',
        unit: 'pessoas em vias sem arborização',
        statement:
          'O Censo 2022 encontrou 58,7 milhões de pessoas morando em vias urbanas sem arborização, 33,7% dos moradores avaliados.',
        localSignal: 'pontos de calor, falta de sombra e caminhos hostis para caminhar.',
        geography: 'Brasil urbano',
        period: 'Censo 2022',
        caveat:
          'O indicador descreve o entorno da via do domicílio; não mede temperatura, cobertura de copa ou qualidade da arborização.',
        sources: [
          {
            label: 'IBGE — Características Urbanísticas do Entorno dos Domicílios',
            url: 'https://educa.ibge.gov.br/criancas/voce-sabia/22715-entorno-dos-domicilios.html'
          }
        ]
      },
      {
        id: 'water-disasters',
        title: 'O risco já é local',
        code: 'DESASTRES HÍDRICOS / BRASIL / 1991–2024',
        value: '5.097',
        unit: 'municípios com ao menos um registro',
        statement:
          'Mais de 91% dos municípios registraram ao menos um desastre relacionado à água; o conjunto analisado impactou diretamente cerca de 129,8 milhões de brasileiros.',
        localSignal: 'alagamentos, drenagem, danos, resposta e lacunas de prevenção.',
        geography: 'Brasil',
        period: '1991–2024',
        caveat:
          'Parte do crescimento dos registros reflete a ampliação da capacidade de notificação; o período não deve ser lido como crescimento climático puro.',
        sources: [
          {
            label: 'Cemaden/MCTI — desastres relacionados à água no Brasil',
            url: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/desastres-relacionados-a-agua-no-brasil-aumentam-nas-ultimas-tres-decadas-e-ja-afetaram-quase-130-milhoes-de-pessoas'
          }
        ]
      }
    ]);
  });
});
