import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import { login, register } from '../lib/api';

export default function LoginPage({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const isRegistration = mode === 'register';
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [angicoId, setAngicoId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    if (isRegistration && password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      if (isRegistration) {
        await register({
          nome: nome.trim(), email: email.trim(),
          angicoId: angicoId.trim().replace(/^@/, '').toLowerCase(), password
        });
      } else {
        await login(email.trim(), password);
      }
      navigate('/app', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível concluir. Tente novamente.');
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
        <form className="login-card" onSubmit={handleSubmit} aria-busy={loading}>
          <span className="overline">{isRegistration ? 'Seu primeiro registro' : 'Acesso ao caderno'}</span>
          <h2>{isRegistration ? 'Criar sua conta' : 'Acessar Angico'}</h2>
          <p>{isRegistration
            ? 'Comece com um espaço só seu. Depois, você pode convidar sua comunidade.'
            : 'Entre com sua conta para continuar os registros da sua comunidade.'}</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          {isRegistration && (
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input id="name" value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" maxLength={120} required />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </div>
          {isRegistration && (
            <div className="field">
              <label htmlFor="angico-id">Angico ID</label>
              <input id="angico-id" value={angicoId} onChange={(event) => setAngicoId(event.target.value)}
                autoComplete="username" autoCapitalize="none" spellCheck={false}
                pattern="@?[A-Za-z0-9._]{3,30}" maxLength={31} aria-describedby="angico-id-hint" required />
              <small id="angico-id-hint">Seu identificador, como @ana.silva. Use de 3 a 30 letras sem acentos, números, pontos ou _.</small>
            </div>
          )}
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegistration ? 'new-password' : 'current-password'}
              minLength={isRegistration ? 8 : undefined} aria-describedby={isRegistration ? 'password-hint' : undefined} required />
            {isRegistration && <small id="password-hint">Use pelo menos 8 caracteres.</small>}
          </div>
          {isRegistration && (
            <div className="field">
              <label htmlFor="password-confirmation">Confirmar senha</label>
              <input id="password-confirmation" type="password" value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required />
            </div>
          )}
          <button className="primary-button" type="submit" disabled={loading}>
            {isRegistration ? (loading ? 'Criando conta…' : 'Criar conta') : (loading ? 'Entrando…' : 'Entrar no território')}
          </button>
          <small>{isRegistration ? 'Já tem uma conta? ' : 'Ainda não tem conta? '}
            <Link to={isRegistration ? '/login' : '/cadastro'} aria-disabled={loading}
              onClick={(event) => { if (loading) event.preventDefault(); }}>
              <strong>{isRegistration ? 'Entrar' : 'Criar conta'}</strong>
            </Link>
          </small>
          {!isRegistration && <small>O acesso offline permanece disponível por tempo limitado após uma sessão validada.</small>}
        </form>
      </section>
    </main>
  );
}
