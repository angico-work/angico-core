import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import { login } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('julia@angico.demo');
  const [password, setPassword] = useState('angico-demo');
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
    <main className="login-page">
      <section className="login-visual">
        <Brand />
        <h1 className="login-title">Transforme conhecimento local em ação coordenada.</h1>
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
          <div className="demo-hint">
            Conta de demonstração já preenchida: <b>julia@angico.demo</b> / <b>angico-demo</b>.
          </div>
        </form>
      </section>
    </main>
  );
}
