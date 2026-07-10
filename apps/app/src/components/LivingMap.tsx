// LivingMap — an ambient picture of a território waking up: observation pins
// settle onto the land, faint lines connect them into relations, and a few
// points pulse with activity. Pure SVG + CSS so it stays light; the animation
// is a slow continuous loop (no scroll listeners) and freezes to its resting
// state under prefers-reduced-motion.

type Kind = 'obs' | 'prob' | 'pot';

const KIND_COLOR: Record<Kind, string> = {
  obs: '#2c8fbd', // observação
  prob: '#f97316', // problema
  pot: '#2aa84a' // potencialidade
};

// Positions in the 600×360 viewBox. delay staggers each pin's entrance.
const PINS: Array<{ x: number; y: number; kind: Kind; delay: number; pulse?: boolean }> = [
  { x: 132, y: 96, kind: 'obs', delay: 0.0, pulse: true },
  { x: 256, y: 62, kind: 'prob', delay: 0.5 },
  { x: 408, y: 104, kind: 'pot', delay: 1.0, pulse: true },
  { x: 188, y: 214, kind: 'obs', delay: 1.5 },
  { x: 330, y: 242, kind: 'obs', delay: 2.0 },
  { x: 474, y: 210, kind: 'prob', delay: 2.5, pulse: true }
];

// Pairs of pin indices that become relations (drawn lines).
const LINKS: Array<[number, number]> = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5]];

export default function LivingMap() {
  return (
    <div className="living-map" role="img" aria-label="Mapa do território com observações conectadas surgindo e pulsando.">
      <svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id="lm-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1.1" cy="1.1" r="1.1" fill="rgba(3,81,111,0.10)" />
          </pattern>
        </defs>

        {/* land + water — soft organic shapes reading as território */}
        <rect x="0" y="0" width="600" height="360" fill="#eef5f1" />
        <path className="lm-water" d="M600 0H372c-30 44 6 78 44 96 50 24 38 70-6 96-58 34-30 72 26 96 24 10 102 28 164 6V0Z" fill="#d6ecef" />
        <path className="lm-veg" d="M0 360V214c52-14 96 6 120-26 26-34 70-30 96-58 22-24-2-66 30-92 18-15 44-16 64-38H0Z" fill="#dcefdf" />
        <path className="lm-veg2" d="M236 360c-8-40 22-58 58-58 28 0 40-26 76-22 26 3 40-18 62-10v90Z" fill="#d2ead7" />
        <rect x="0" y="0" width="600" height="360" fill="url(#lm-grid)" />

        {/* relations between pins */}
        <g className="lm-links" stroke="#1b8a8b" strokeWidth="1.6" fill="none" strokeLinecap="round">
          {LINKS.map(([a, b], i) => (
            <line
              key={i}
              x1={PINS[a].x}
              y1={PINS[a].y}
              x2={PINS[b].x}
              y2={PINS[b].y}
              className="lm-link"
              style={{ animationDelay: `${0.4 + i * 0.35}s` }}
            />
          ))}
        </g>

        {/* observation pins — outer <g> positions, inner <g> animates so the
            scale-in stays centered on the pin */}
        {PINS.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <g className="lm-pin" style={{ animationDelay: `${p.delay}s` }}>
              {p.pulse && <circle className="lm-pulse" r="9" fill="none" stroke={KIND_COLOR[p.kind]} style={{ animationDelay: `${p.delay + 0.6}s` }} />}
              <circle r="8.5" fill="#fff" />
              <circle r="6" fill={KIND_COLOR[p.kind]} />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
