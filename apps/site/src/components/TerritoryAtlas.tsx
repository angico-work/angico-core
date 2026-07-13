const legendLayers = [
  { id: 'water', label: 'Água', color: '#34aba6' },
  { id: 'vegetation', label: 'Vegetação', color: '#2d8b73' },
  { id: 'pressure', label: 'Pressão', color: '#b7653b' },
  { id: 'path', label: 'Caminho', color: '#f5f2ec' },
  { id: 'record', label: 'Registro', color: '#004b6c' }
] as const;

const traceSteps = [
  { id: 'observation', title: 'Observação', description: 'O que foi percebido no lugar.' },
  { id: 'action', title: 'Ação', description: 'A resposta ligada à sua origem.' },
  { id: 'evidence', title: 'Evidência', description: 'Autoria e momento preservados.' },
  { id: 'result', title: 'Resultado', description: 'A mudança sem perder o percurso.' }
] as const;

export default function TerritoryAtlas() {
  return (
    <figure className="atlas" aria-labelledby="atlas-title" aria-describedby="atlas-summary">
      <p id="atlas-summary" className="sr-only">
        Prancha demonstrativa com limite territorial, relevo, área de drenagem, água,
        vegetação, fragmentos, cicatriz de fogo, caminhos, travessia, escola, praça, ponto
        comunitário, alagamento, calor, falta de sombra, grade, norte, escala e Rastro.
      </p>

      <div className="a-plate">
        <span id="atlas-title" className="a-meta a-label">
          Atlas demonstrativo — sem dados operacionais
        </span>
        <span className="a-meta a-north" aria-hidden="true">
          <b>↑</b> Norte
        </span>
        <span className="a-meta a-scale" aria-hidden="true">
          0 · 250 · 500 m
        </span>
        <span className="a-meta a-grid-label" aria-hidden="true">
          Grade A–D / 1–4
        </span>

        <svg
          className="a-svg"
          viewBox="0 0 1200 760"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <pattern id="atlas-grid" width="240" height="152" patternUnits="userSpaceOnUse">
              <path
                d="M240 0H0V152"
                fill="none"
                stroke="#8dac9f"
                strokeWidth="1"
                opacity=".28"
              />
            </pattern>
            <pattern id="fragment-pattern" width="34" height="30" patternUnits="userSpaceOnUse">
              <path d="m4 9 9-5 8 7-4 10-11-2Z" fill="#2d8b73" opacity=".58" />
              <path d="m23 21 6-3 4 5-5 5-6-2Z" fill="#75a092" opacity=".7" />
            </pattern>
            <pattern id="fire-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="m-4 18 28-14M2 26 30-2" stroke="#b7653b" strokeWidth="5" opacity=".66" />
            </pattern>
          </defs>

          <g className="map-base atlas-reveal">
            <rect width="1200" height="760" fill="#dfeae6" />
            <rect x="38" y="38" width="1124" height="684" fill="url(#atlas-grid)" />
            <g fill="#58756d" fontFamily="var(--font-label)" fontSize="16" textAnchor="middle">
              {['A', 'B', 'C', 'D'].map((label, index) => (
                <text data-grid-axis="column" x={180 + index * 280} y="28" key={label}>
                  {label}
                </text>
              ))}
            </g>
            <g fill="#58756d" fontFamily="var(--font-label)" fontSize="16" textAnchor="middle">
              {['1', '2', '3', '4'].map((label, index) => (
                <text data-grid-axis="row" x="20" y={124 + index * 170} key={label}>
                  {label}
                </text>
              ))}
            </g>
            <path
              d="M93 117 330 55l173 91 270-56 320 114-70 183 81 181-235 111-210-57-231 72-177-106 44-169-180-113Z"
              fill="#cfdfd8"
              stroke="#6f978b"
              strokeWidth="4"
            />
            <g fill="none" stroke="#8dac9f" strokeWidth="2" opacity=".58">
              <path d="M86 234c154-76 304-51 442 21s300 91 586-19" />
              <path d="M69 466c191-64 337-36 483 47s319 78 584-14" />
              <path d="M203 78c-23 139 30 230 12 352-14 103 0 182 59 281" />
              <path d="M725 62c-48 130-13 226 24 320 45 116 18 217-27 329" />
            </g>
          </g>

          <g className="map-details atlas-reveal" style={{ animationDelay: '.8s' }}>
            <path
              data-layer="drainage"
              d="M92 128c210 28 298 214 470 226 190 13 277-154 527-100l40 170c-236-74-356 96-558 82C351 491 238 277 65 248Z"
              fill="#34aba6"
              fillOpacity=".1"
              stroke="#34aba6"
              strokeDasharray="12 10"
              strokeWidth="3"
            />
            <g data-layer="water" fill="none" strokeLinecap="round">
              <path
                d="M69 166c175 65 217 190 391 203 205 16 257-154 448-132 94 11 167 59 253 106"
                stroke="#f7f4ee"
                strokeWidth="43"
              />
              <path
                d="M69 166c175 65 217 190 391 203 205 16 257-154 448-132 94 11 167 59 253 106"
                stroke="#34aba6"
                strokeWidth="11"
              />
              <path d="M290 110c48 83 89 132 170 259" stroke="#34aba6" strokeWidth="6" />
              <path d="M909 237c-18 66-43 110-91 166" stroke="#34aba6" strokeWidth="6" />
            </g>

            <g data-layer="paths" fill="none" stroke="#f8f5ef" strokeWidth="14" strokeDasharray="22 12">
              <path d="M103 676c145-159 245-241 406-292 199-64 329-203 589-294" />
              <path d="M175 78c110 159 218 226 253 400 23 112 116 176 286 226" />
            </g>

            <g data-layer="vegetation">
              <path
                d="m156 389 191-88 118 91-47 162-191 45-123-111Z"
                fill="#68af8e"
                fillOpacity=".58"
                stroke="#2d8b73"
                strokeWidth="3"
              />
              <path
                d="m725 421 201-82 143 88-59 154-189 33-132-94Z"
                fill="#e8d6a8"
                fillOpacity=".7"
                stroke="#9a7832"
                strokeWidth="3"
              />
            </g>

            <path
              data-layer="fragments"
              d="M466 164h173v126H493l-48-51Z"
              fill="url(#fragment-pattern)"
              stroke="#2d8b73"
              strokeWidth="2"
            />
            <path
              data-layer="fire"
              d="m848 116 160 36 59 97-126 38-118-55Z"
              fill="url(#fire-pattern)"
              stroke="#b7653b"
              strokeWidth="3"
            />

            <g fill="#3c4f54" fontFamily="var(--font-label)" fontSize="17" letterSpacing="1">
              <text x="696" y="208">Curso d'água</text>
              <text x="137" y="654">Caminho local</text>
              <text x="172" y="455">Área acompanhada</text>
              <text x="782" y="493">Zona de cuidado</text>
              <text x="470" y="151">Fragmentos</text>
              <text x="895" y="110">Cicatriz de fogo</text>
            </g>
          </g>

          <g
            data-layer="signals"
            className="a-signals atlas-reveal"
            style={{ animationDelay: '1.35s' }}
          >
            <g transform="translate(374 190)">
              <circle r="17" fill="#2d8b73" />
              <path d="M-8 5h16M-5 1h10M-2-3h4" stroke="#fff" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Praça</text>
            </g>
            <g transform="translate(252 540)">
              <circle r="17" fill="#004b6c" />
              <path d="M-6 2h12M0-6v12" stroke="#fff" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Escola</text>
            </g>
            <g transform="translate(694 322)">
              <rect x="-16" y="-11" width="32" height="22" fill="#f7f4ee" stroke="#004b6c" strokeWidth="3" />
              <path d="M-11-5h22M-11 5h22" stroke="#34aba6" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Travessia</text>
            </g>
            <g transform="translate(522 599)">
              <circle r="17" fill="#34aba6" />
              <path d="m-7 5 5-10 4 7 5-4" fill="none" stroke="#fff" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Alagamento</text>
            </g>
            <g transform="translate(785 655)">
              <circle r="17" fill="#004b6c" />
              <path d="M-8 6V-4l8-6 8 6V6M-3 6V0h6v6" fill="none" stroke="#fff" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Ponto comunitário</text>
            </g>
            <g transform="translate(1042 432)">
              <circle r="17" fill="#b7653b" />
              <path d="M-7 4 0-8 7 4Z" fill="none" stroke="#fff" strokeWidth="3" />
              <text x="-58" y="35" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Calor</text>
            </g>
            <g transform="translate(1000 540)">
              <circle r="17" fill="#b7653b" fillOpacity=".82" />
              <path d="M-8 2h16M-5-4h10M-2-9h4" stroke="#fff" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Sem sombra</text>
            </g>
          </g>

          <g className="a-trace" fontWeight="700">
            <path className="a-route a-route--one" style={{ animationDelay: '2.6s' }} pathLength="1" d="M620 536C681 485 727 447 776 405" />
            <path className="a-route a-route--two" style={{ animationDelay: '3.4s' }} pathLength="1" d="M776 405C825 381 870 360 916 344" />
            <path className="a-route a-route--three" style={{ animationDelay: '4.2s' }} pathLength="1" d="M916 344C966 324 1014 303 1062 280" />

            <g className="a-marker a-marker--observation atlas-reveal" style={{ animationDelay: '1.8s' }}>
              <circle cx="620" cy="536" r="24" fill="#34aba6" />
              <text x="620" y="542">1</text>
            </g>
            <g className="a-marker a-marker--action atlas-reveal" style={{ animationDelay: '2.6s' }}>
              <rect x="755" y="384" width="42" height="42" fill="#003952" transform="rotate(45 776 405)" />
              <text x="776" y="411">2</text>
            </g>
            <g className="a-marker a-marker--evidence atlas-reveal" style={{ animationDelay: '3.4s' }}>
              <circle cx="916" cy="344" r="24" fill="#004b6c" />
              <circle cx="916" cy="344" r="9" fill="#fff" opacity=".4" />
              <text x="916" y="350">3</text>
            </g>
            <g className="a-marker a-marker--result atlas-reveal" style={{ animationDelay: '4.2s' }}>
              <path d="m1062 251 29 29-29 29-29-29Z" fill="#003952" />
              <text x="1062" y="286">4</text>
            </g>
          </g>
        </svg>
      </div>

      <p className="a-features">
        Sinais locais: escola · praça · ponto comunitário · travessia · alagamento · calor · falta de sombra
      </p>

      <ul className="a-legend" aria-label="Camadas do atlas demonstrativo">
        {legendLayers.map((layer) => (
          <li key={layer.id} data-legend={layer.id}>
            <span aria-hidden="true" style={{ background: layer.color }} />
            {layer.label}
          </li>
        ))}
      </ul>

      <figcaption className="trace">
        <span className="t-label">Rastro demonstrativo</span>
        <ol aria-label="Percurso demonstrativo do território">
          {traceSteps.map((step, index) => (
            <li className={`t-step t-step--${step.id}`} key={step.id}>
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
