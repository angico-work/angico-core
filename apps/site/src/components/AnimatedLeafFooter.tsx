import type { CSSProperties } from 'react';

type LeafTrajectory = 'left' | 'center' | 'right';

interface LeafDescriptor {
  readonly id: string;
  readonly trajectory: LeafTrajectory;
  readonly x: string;
  readonly size: string;
  readonly duration: string;
  readonly delay: string;
  readonly opacity: string;
  readonly rest: string;
}

interface LeafStyle extends CSSProperties {
  '--leaf-x': string;
  '--leaf-size': string;
  '--leaf-duration': string;
  '--leaf-delay': string;
  '--leaf-opacity': string;
  '--leaf-rest': string;
  '--leaf-start-x': string;
  '--leaf-mid-x': string;
  '--leaf-end-x': string;
  '--leaf-start-r': string;
  '--leaf-mid-r': string;
  '--leaf-end-r': string;
}

const trajectoryStyles = {
  left: {
    '--leaf-start-x': '-28px',
    '--leaf-mid-x': '18px',
    '--leaf-end-x': '-7px',
    '--leaf-start-r': '-28deg',
    '--leaf-mid-r': '112deg',
    '--leaf-end-r': '252deg'
  },
  center: {
    '--leaf-start-x': '8px',
    '--leaf-mid-x': '-24px',
    '--leaf-end-x': '15px',
    '--leaf-start-r': '12deg',
    '--leaf-mid-r': '148deg',
    '--leaf-end-r': '286deg'
  },
  right: {
    '--leaf-start-x': '26px',
    '--leaf-mid-x': '-16px',
    '--leaf-end-x': '31px',
    '--leaf-start-r': '30deg',
    '--leaf-mid-r': '176deg',
    '--leaf-end-r': '320deg'
  }
} as const satisfies Record<
  LeafTrajectory,
  Pick<
    LeafStyle,
    | '--leaf-start-x'
    | '--leaf-mid-x'
    | '--leaf-end-x'
    | '--leaf-start-r'
    | '--leaf-mid-r'
    | '--leaf-end-r'
  >
>;

const leaves = [
  { id: '01', trajectory: 'left', x: '12%', size: '32px', duration: '8.6s', delay: '-1.2s', opacity: '.42', rest: '24px' },
  { id: '02', trajectory: 'center', x: '31%', size: '48px', duration: '10.2s', delay: '-7.4s', opacity: '.36', rest: '36px' },
  { id: '03', trajectory: 'right', x: '58%', size: '28px', duration: '7.8s', delay: '-3.9s', opacity: '.54', rest: '20px' },
  { id: '04', trajectory: 'center', x: '78%', size: '36px', duration: '12.4s', delay: '-10.8s', opacity: '.28', rest: '30px' },
  { id: '05', trajectory: 'right', x: '17%', size: '40px', duration: '9.4s', delay: '-6.1s', opacity: '.34', rest: '18px' },
  { id: '06', trajectory: 'left', x: '43%', size: '26px', duration: '8.1s', delay: '-5.3s', opacity: '.58', rest: '42px' },
  { id: '07', trajectory: 'center', x: '65%', size: '54px', duration: '11.6s', delay: '-2.7s', opacity: '.31', rest: '26px' },
  { id: '08', trajectory: 'left', x: '82%', size: '28px', duration: '9.9s', delay: '-8.8s', opacity: '.46', rest: '44px' },
  { id: '09', trajectory: 'right', x: '14%', size: '72px', duration: '12.1s', delay: '-4.6s', opacity: '.18', rest: '16px' },
  { id: '10', trajectory: 'center', x: '37%', size: '30px', duration: '8.9s', delay: '-7.9s', opacity: '.62', rest: '32px' },
  { id: '11', trajectory: 'left', x: '62%', size: '44px', duration: '10.8s', delay: '-9.7s', opacity: '.39', rest: '22px' },
  { id: '12', trajectory: 'right', x: '76%', size: '34px', duration: '9.1s', delay: '-2.1s', opacity: '.49', rest: '40px' }
] as const satisfies readonly LeafDescriptor[];

export default function AnimatedLeafFooter() {
  return (
    <footer className="site-footer">
      <div className="leaf-stage" aria-hidden="true">
        {leaves.map((leaf) => {
          const style: LeafStyle = {
            ...trajectoryStyles[leaf.trajectory],
            '--leaf-x': leaf.x,
            '--leaf-size': leaf.size,
            '--leaf-duration': leaf.duration,
            '--leaf-delay': leaf.delay,
            '--leaf-opacity': leaf.opacity,
            '--leaf-rest': leaf.rest
          };

          return (
            <span
              className="leaf"
              data-trajectory={leaf.trajectory}
              key={leaf.id}
              style={style}
            />
          );
        })}
      </div>

      <div className="site-frame footer-inner">
        <a className="footer-wordmark" href="#inicio" aria-label="Angico, voltar ao início">
          <img src="/angico-logo-white.png" alt="" />
        </a>
        <p>Memória coletiva para ações que precisam continuar.</p>
        <a href="#conteudo">Voltar ao início</a>
      </div>
    </footer>
  );
}
