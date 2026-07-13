import {
  ENVIRONMENTAL_CONTEXT_BOUNDARY,
  ENVIRONMENTAL_INDICATORS_UPDATED_LABEL,
  environmentalIndicators
} from '../data/environmentalIndicators';

export default function EnvironmentalContext() {
  return (
    <section id="contexto-climatico" className="climate" aria-labelledby="climate-title">
      <div className="site-frame c-inner">
        <header className="c-heading">
          <p className="section-label">— Contexto climático do território</p>
          <h2 id="climate-title">Quando o território muda, quem vive nele sente primeiro.</h2>
          <p>
            Dados públicos ajudam a dimensionar a pressão. O Angico organiza o que cada
            comunidade percebe, prioriza, faz e comprova no lugar.
          </p>
        </header>

        <p className="c-boundary" role="note">
          {ENVIRONMENTAL_CONTEXT_BOUNDARY}
        </p>

        <ol className="c-ledger" aria-label="Indicadores climáticos públicos">
          {environmentalIndicators.map((indicator, index) => (
            <li className={index === 0 ? 'c-entry c-entry--lead' : 'c-entry'} key={indicator.id}>
              <p className="c-code">{indicator.code}</p>
              <h3>{indicator.title}</h3>
              <p className="c-measure">
                <strong>{indicator.value}</strong>
                <span>{indicator.unit}</span>
              </p>
              <p className="c-statement">{indicator.statement}</p>
              <dl className="c-meta">
                <div>
                  <dt>Território</dt>
                  <dd>{indicator.geography}</dd>
                </div>
                <div>
                  <dt>Período</dt>
                  <dd>{indicator.period}</dd>
                </div>
              </dl>
              <p className="c-local">
                <b>No território</b>
                <span>{indicator.localSignal}</span>
              </p>
              <p className="c-caveat">{indicator.caveat}</p>
              <div className="c-sources">
                {indicator.sources.map((source) => (
                  <a
                    aria-label={`Fonte: ${source.label} — ${indicator.title}`}
                    href={source.url}
                    key={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {source.label}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <p className="c-updated">{ENVIRONMENTAL_INDICATORS_UPDATED_LABEL}</p>
      </div>
    </section>
  );
}
