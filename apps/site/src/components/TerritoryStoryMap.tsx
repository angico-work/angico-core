const traceSteps = [
  {
    id: 'observation',
    title: 'Observação',
    description: 'O que foi percebido no lugar.'
  },
  {
    id: 'action',
    title: 'Ação',
    description: 'A resposta ligada à sua origem.'
  },
  {
    id: 'evidence',
    title: 'Evidência',
    description: 'Autoria e momento preservados.'
  },
  {
    id: 'result',
    title: 'Resultado',
    description: 'A mudança sem perder o percurso.'
  }
] as const;

export default function TerritoryStoryMap() {
  return (
    <figure className="territory-story-map" aria-labelledby="territory-map-caption">
      <div className="territory-map__canvas">
        <span className="territory-map__demo-label">
          Demonstração visual — sem dados operacionais
        </span>

        <svg
          className="territory-map__svg"
          viewBox="0 0 1200 760"
          aria-hidden="true"
          focusable="false"
        >
          <g className="territory-map__layer territory-map__layer--base">
            <rect width="1200" height="760" fill="#dfeae6" />
            <path
              className="territory-map__boundary"
              d="M62 92 338 24l181 98 291-66 326 121-76 221 92 210-254 116-233-62-238 72-190-113 54-192-204-127Z"
            />
            <g className="territory-map__contours">
              <path d="M38 232c172-82 316-54 462 26s310 96 656-24" />
              <path d="M24 466c207-69 350-38 503 49s340 82 645-19" />
              <path d="M189 26c-28 156 32 252 14 391-15 117-2 211 66 337" />
              <path d="M729 6c-63 151-19 267 21 371 54 139 20 255-35 383" />
            </g>
          </g>

          <g className="territory-map__layer territory-map__layer--details">
            <path
              className="territory-map__river-bank"
              d="M-38 118c208 77 236 232 432 247 226 18 272-185 494-160 116 13 202 79 350 149"
            />
            <path
              className="territory-map__river"
              d="M-38 118c208 77 236 232 432 247 226 18 272-185 494-160 116 13 202 79 350 149"
            />
            <path
              className="territory-map__road"
              d="M71 720c159-181 259-271 437-327 221-70 346-239 630-345"
            />
            <path
              className="territory-map__road"
              d="M168 37c126 185 251 249 286 454 22 130 123 202 326 257"
            />
            <path
              className="territory-map__area territory-map__area--care"
              d="m168 389 220-101 128 104-52 188-220 53-141-128Z"
            />
            <path
              className="territory-map__area territory-map__area--community"
              d="m696 421 231-95 163 100-68 179-214 37-151-106Z"
            />
            <text x="704" y="246">Curso d'água</text>
            <text x="126" y="682">Caminho local</text>
            <text x="218" y="454">Área acompanhada</text>
            <text x="782" y="478">Zona de cuidado</text>
          </g>

          <g className="territory-map__trace">
            <path
              className="territory-map__route territory-map__route--one"
              pathLength="1"
              d="M206 576C342 483 433 422 558 372"
            />
            <path
              className="territory-map__route territory-map__route--two"
              pathLength="1"
              d="M558 372C679 321 758 260 865 186"
            />
            <path
              className="territory-map__route territory-map__route--three"
              pathLength="1"
              d="M865 186C954 151 1026 139 1100 118"
            />

            <g className="territory-map__marker territory-map__marker--observation">
              <circle cx="206" cy="576" r="25" />
              <text x="206" y="582">1</text>
            </g>
            <g className="territory-map__marker territory-map__marker--action">
              <rect x="536" y="350" width="44" height="44" transform="rotate(45 558 372)" />
              <text x="558" y="378">2</text>
            </g>
            <g className="territory-map__marker territory-map__marker--evidence">
              <circle cx="865" cy="186" r="25" />
              <circle cx="865" cy="186" r="10" className="territory-map__marker-core" />
              <text x="865" y="192">3</text>
            </g>
            <g className="territory-map__marker territory-map__marker--result">
              <path d="m1100 88 30 30-30 30-30-30Z" />
              <text x="1100" y="124">4</text>
            </g>
          </g>
        </svg>
      </div>

      <figcaption id="territory-map-caption" className="territory-trace">
        <span className="territory-trace__label">Rastro demonstrativo</span>
        <ol aria-label="Percurso demonstrativo do território">
          {traceSteps.map((step, index) => (
            <li
              className={'territory-trace__step territory-trace__step--' + step.id}
              key={step.id}
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <strong>{step.title}</strong>
              <small>{step.description}</small>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
