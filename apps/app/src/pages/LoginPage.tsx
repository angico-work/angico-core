import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import { login } from '../lib/api';

// Each leaf drifts in from above and settles at its resting top/left over ~2s.
const FALLING_LEAVES: CSSProperties[] = [
  { left: '3%', top: '7%', ['--lw' as string]: '204px', ['--lo' as string]: '0.85', ['--ld' as string]: '0.04s', ['--lx' as string]: '12vw', ['--r0' as string]: '-28deg', ['--r1' as string]: '6deg' },
  { left: '30%', top: '3%', ['--lw' as string]: '108px', ['--lo' as string]: '0.5', ['--ld' as string]: '0.22s', ['--lx' as string]: '-7vw', ['--r0' as string]: '18deg', ['--r1' as string]: '-8deg' },
  { left: '17%', top: '62%', ['--lw' as string]: '70px', ['--lo' as string]: '0.36', ['--ld' as string]: '0.36s', ['--lx' as string]: '7vw', ['--r0' as string]: '-10deg', ['--r1' as string]: '12deg' },
  { left: '63%', top: '18%', ['--lw' as string]: '132px', ['--lo' as string]: '0.42', ['--ld' as string]: '0.12s', ['--lx' as string]: '10vw', ['--r0' as string]: '-16deg', ['--r1' as string]: '9deg' },
  { left: '82%', top: '56%', ['--lw' as string]: '82px', ['--lo' as string]: '0.3', ['--ld' as string]: '0.28s', ['--lx' as string]: '6vw', ['--r0' as string]: '14deg', ['--r1' as string]: '-10deg' },
  { left: '47%', top: '38%', ['--lw' as string]: '56px', ['--lo' as string]: '0.26', ['--ld' as string]: '0.44s', ['--lx' as string]: '-4vw', ['--r0' as string]: '-8deg', ['--r1' as string]: '13deg' }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page dusk-scene">
      <div className="leaf-fall-layer" aria-hidden="true">
        {FALLING_LEAVES.map((style, i) => (
          <img key={i} className="leaf-fall" src="/angico-leaf.png" alt="" style={style} />
        ))}
      </div>
      <section className="login-visual">
        <Brand />
        <h1 className="login-title">Transforme conhecimento <span className="marker">local em ação coordenada</span>.</h1>
        <p>Entre no workspace da sua comunidade para registrar observações, validar problemas, organizar missões e acompanhar resultados no tempo.</p>
      </section>
      <section className="login-form-panel">
        <form className="login-card" id="login-form" onSubmit={handleSubmit}>
          <Brand small tagline={false} />
          <h2>Acessar Angico</h2>
          <p>Entre com seu e-mail e senha de liderança.</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar no território'}
          </button>
        </form>
      </section>
    </main>
  );
}
