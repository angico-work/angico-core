import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import { login } from '../lib/api';

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
      navigate('/app', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-context">
        <Brand />
        <div className="login-statement">
          <span className="overline">Memória operacional socioambiental</span>
          <h1>O que acontece no território não precisa desaparecer.</h1>
          <p>Registre em campo, preserve evidências e acompanhe como ações coletivas se tornam resultados verificáveis.</p>
        </div>
        <ol className="login-trace" aria-label="Caminho do impacto">
          <li><span>01</span>Observação</li>
          <li><span>02</span>Ação</li>
          <li><span>03</span>Evidência</li>
          <li><span>04</span>Resultado</li>
        </ol>
      </section>
      <section className="login-form-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <span className="overline">Acesso ao caderno</span>
          <h2>Acessar Angico</h2>
          <p>Use a conta vinculada à sua organização ou comunidade.</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar no território'}
          </button>
          <small>O acesso offline permanece disponível por tempo limitado após uma sessão validada.</small>
        </form>
      </section>
    </main>
  );
}
