import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';

export default function LoginPage() {
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    localStorage.setItem('angico_session', 'demo');
    navigate('/app');
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
          <p>Primeira versão demonstrativa do workspace territorial.</p>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" defaultValue="julia@angico.demo" autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" defaultValue="angico-demo" autoComplete="current-password" />
          </div>
          <button className="primary-button" type="submit">Entrar no território</button>
          <div className="demo-hint">
            Demo local: qualquer envio abre a aplicação principal. O login real ficará ligado ao módulo de workspaces e permissões.
          </div>
        </form>
      </section>
    </main>
  );
}
