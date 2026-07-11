const traceSteps = [
  {
    id: 'territorio',
    title: 'Território',
    description: 'O lugar onde a história se acumula.'
  },
  {
    id: 'observacao',
    title: 'Observação ou potencialidade',
    description: 'O que foi percebido por quem está presente.'
  },
  {
    id: 'missao',
    title: 'Missão',
    description: 'A resposta organizada para uma necessidade real.'
  },
  {
    id: 'acao',
    title: 'Ação',
    description: 'O trabalho realizado, com tempo e autoria.'
  },
  {
    id: 'evidencia',
    title: 'Evidência',
    description: 'O registro que sustenta o que foi feito.'
  },
  {
    id: 'resultado',
    title: 'Resultado',
    description: 'A mudança observada sem perder a origem.'
  },
  {
    id: 'indicador',
    title: 'Indicador',
    description: 'O sinal acompanhado ao longo do tempo.'
  }
];

export default function TracePath() {
  return (
    <section id="rastro" className="trace-section" aria-labelledby="trace-title">
      <div className="site-frame trace-inner">
        <div className="trace-heading">
          <p className="section-label section-label-light">— 01 – Rastro verificável</p>
          <h2 id="trace-title">Uma ação não é uma linha solta no relatório.</h2>
          <p>
            Ela nasce em um contexto, mobiliza pessoas e só se torna aprendizado quando evidência,
            resultado e acompanhamento permanecem no mesmo percurso.
          </p>
        </div>

        <ol className="trace-list" aria-label="Percurso do impacto socioambiental">
          {traceSteps.map((step, index) => (
            <li key={step.id}>
              <div className="trace-step">
                <span className="trace-node" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="trace-name">{step.title}</span>
                <span className="trace-description">{step.description}</span>
              </div>
            </li>
          ))}
        </ol>

        <p className="trace-participants">
          <span>Pessoas · organizações · recursos</span>
          entram no ponto em que tornaram a ação possível — não em uma lista paralela.
        </p>
      </div>
    </section>
  );
}
