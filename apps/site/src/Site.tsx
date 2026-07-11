import ContactSection from './components/ContactSection';
import TracePath from './components/TracePath';

export interface SiteProps {
  appUrl: string;
  contactApiUrl: string;
}

const principles = [
  {
    term: 'Fragmentos',
    title: 'O trabalho começa onde as pessoas já estão.',
    description:
      'Observações, fotografias, mensagens e atividades ganham contexto sem transformar o campo em burocracia.'
  },
  {
    term: 'Relações',
    title: 'Cada registro encontra o seu lugar na história.',
    description:
      'Pessoas, organizações, territórios e recursos permanecem ligados à ação que tornaram possível.'
  },
  {
    term: 'Continuidade',
    title: 'O que falta também permanece visível.',
    description:
      'Lacunas de autoria, evidência ou resultado indicam onde retomar o trabalho, sem inventar conclusões.'
  }
];

const questions = [
  ['O que aconteceu?', 'A sequência de observações, missões e ações.'],
  ['Onde e com quem?', 'O território e as pessoas, organizações e recursos envolvidos.'],
  ['O que comprova?', 'As evidências ligadas à origem e à autoria do registro.'],
  ['O que mudou?', 'Resultados e indicadores apresentados com o contexto que os sustenta.']
];

export default function Site({ appUrl, contactApiUrl }: SiteProps) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className="site-header">
        <div className="site-frame header-inner">
          <a className="wordmark" href="#inicio" aria-label="Angico, início">
            <span className="wordmark-image" aria-hidden="true" />
          </a>

          <nav aria-label="Navegação principal">
            <a href="#rastro">Rastro</a>
            <a href="#principio">Princípio</a>
            <a href="#contato">Contato</a>
            {appUrl && (
              <a className="header-access" href={appUrl}>
                Acessar
              </a>
            )}
          </nav>
        </div>
      </header>

      <main id="conteudo">
        <section id="inicio" className="hero site-frame" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">— Memória operacional socioambiental</p>
            <h1 id="hero-title">
              A ação acontece hoje. <span>O território precisa lembrar amanhã.</span>
            </h1>
            <p className="hero-summary">
              O Angico transforma registros dispersos em memória coletiva: mostra quem participou,
              onde aconteceu, qual evidência sustenta o resultado e o que ainda precisa ser feito.
            </p>

            <div className="hero-actions">
              {appUrl ? (
                <a className="primary-action" href={appUrl}>
                  Entrar no aplicativo
                </a>
              ) : (
                <p className="availability-note">
                  O acesso ao aplicativo está temporariamente indisponível.
                </p>
              )}
              <a className="text-action" href="#rastro">
                Percorrer o rastro
              </a>
            </div>
          </div>

          <aside className="hero-principle" aria-label="Princípio do Angico">
            <p className="register-code">— Princípio 01</p>
            <p>Impacto não é apenas declarado.</p>
            <p>Ele é construído, relacionado e demonstrado ao longo do tempo.</p>
          </aside>
        </section>

        <TracePath />

        <section id="principio" className="chapter site-frame" aria-labelledby="principle-title">
          <div className="chapter-heading">
            <p className="section-label">— 02 – Por que existe</p>
            <h2 id="principle-title">Fragmentos só viram memória quando permanecem conectados.</h2>
          </div>

          <div className="principle-list">
            {principles.map((principle) => (
              <article className="principle-row" key={principle.term}>
                <p className="register-code">{principle.term}</p>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="field-section" aria-labelledby="field-title">
          <div className="site-frame field-inner">
            <div>
              <p className="section-label">— 03 – Realidade do território</p>
              <h2 id="field-title">Pouca conexão não pode significar pouca memória.</h2>
            </div>
            <div className="field-copy">
              <p>
                O Angico é orientado pela realidade de equipes pequenas, trabalho em campo e
                conectividade instável. Registro local, pendência e confirmação remota são estados
                diferentes — e precisam continuar claros para quem está trabalhando.
              </p>
              <ul>
                <li>Registrar com poucos passos e linguagem reconhecível.</li>
                <li>Preservar evidências sem apagar autoria ou contexto.</li>
                <li>Retomar uma ação sem perder o que já foi coletado.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="distinction site-frame" aria-labelledby="distinction-title">
          <div>
            <p className="section-label">— 04 – O que o Angico responde</p>
            <h2 id="distinction-title">Não é um placar verde.</h2>
            <p className="distinction-lead">
              É uma memória de trabalho para quem precisa compreender e demonstrar uma mudança sem
              separar o resultado das pessoas e do território que o produziram.
            </p>
          </div>

          <dl className="question-list">
            {questions.map(([question, answer]) => (
              <div key={question}>
                <dt>{question}</dt>
                <dd>{answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="public-boundary" aria-labelledby="boundary-title">
          <div className="site-frame boundary-inner">
            <p className="register-code">Uma fronteira simples</p>
            <h2 id="boundary-title">O site explica. O aplicativo guarda o trabalho.</h2>
            <p>
              Esta página pública não consulta nem exibe registros operacionais. Territórios,
              evidências, conversas e histórico permanecem no ambiente autenticado do Angico.
            </p>
          </div>
        </section>

        <ContactSection appUrl={appUrl} contactApiUrl={contactApiUrl} />
      </main>

      <footer className="site-footer">
        <div className="site-frame footer-inner">
          <a className="footer-wordmark" href="#inicio" aria-label="Angico, voltar ao início">
            <img src="/angico-logo-white.png" alt="" />
          </a>
          <p>Memória coletiva para ações que precisam continuar.</p>
          <a href="#conteudo">Voltar ao início</a>
        </div>
      </footer>
    </div>
  );
}
