# Assistente Angico — protótipo v1

O cadastro de observações e problemas oferece classificação assistida em nove
categorias socioambientais. A pessoa solicita uma análise, vê os termos associados
e decide se aplica a categoria. A análise não salva registros, não altera urgência
ou severidade e não se aplica a potencialidades.

## Modelo e dados

`apps/app/src/lib/fieldIntelligence.ts` implementa um classificador de centroides
com vetores TF-IDF normalizados e similaridade cosseno (Rocchio). Os pesos são
calculados uma vez, sob demanda, a partir de 36 frases ilustrativas escritas para
o protótipo. Não são dados de campo nem registros de clientes. Não há biblioteca
de modelos, download de pesos, chave de API, chamada externa ou aprendizado
automático com relatos pessoais.

O texto passa por normalização de acentos, remoção de palavras comuns e limite
de 8.000 caracteres para conter o custo da análise. O modelo se abstém quando
há menos de dois termos reconhecidos, similaridade inferior a 0,25 ou diferença
inferior a 0,08 entre as duas primeiras categorias. Esses limites são heurísticos,
não representam uma probabilidade calibrada. A interface não publica percentuais
de confiança nem afirma que o evento ocorreu: uma frase negada ainda pode tratar
do mesmo assunto.

## Limites e validação

O vocabulário é pequeno, em português, e não compreende contexto, ironia,
negativas ou relatos complexos como um modelo de linguagem. Não detecta riscos,
não produz previsões e não avalia imagens. O classificador ainda não foi validado
em campo. Testes com frases distintas do conjunto de treinamento verificam as
nove categorias, entradas insuficientes ou alheias ao domínio e explicações. São
testes de regressão, não uma medição de acurácia no mundo real.

O teste de integração do cadastro verifica aplicação explícita, preservação da
urgência e invalidação da sugestão após editar o relato. A análise é local; o
salvamento posterior mantém a sincronização normal do produto.

## Evolução

Antes de expandir as promessas públicas, obter exemplos autorizados e rotulados
por pessoas do território, separar treinamento e avaliação por território,
medir erros e abstenções por categoria e validar correções com usuários. Análise
de recorrência e conexões entre registros permanece uma direção de pesquisa,
sem disponibilidade ou prazo prometido.
