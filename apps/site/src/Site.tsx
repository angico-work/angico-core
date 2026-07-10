export interface SiteProps {
  appUrl: string;
  contactApiUrl: string;
}

const traceSteps = ['Origem', 'Coleta', 'Evidência', 'Destino'];

export default function Site({ appUrl, contactApiUrl }: SiteProps) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#inicio" aria-label="Angico, início">
          Angico
        </a>
        <nav aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#contato">Contato</a>
        </nav>
      </header>

      <main id="inicio">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Inteligência socioambiental</p>
            <h1 id="hero-title">Memória territorial para ações que precisam permanecer.</h1>
            <p className="hero-summary">
              O Angico conecta registros, pessoas e evidências para que organizações acompanhem o
              que aconteceu, o que falta comprovar e qual é o próximo passo no território.
            </p>
            {appUrl ? (
              <a className="primary-action" href={appUrl}>
                Acessar o Angico
              </a>
            ) : (
              <p className="availability-note">O acesso ao aplicativo está temporariamente indisponível.</p>
            )}
          </div>

          <aside className="trace" aria-label="Exemplo de rastro verificável">
            <p className="trace-label">Rastro verificável</p>
            <ol>
              {traceSteps.map((step) => (
                <li key={step}>
                  <span aria-hidden="true" />
                  {step}
                </li>
              ))}
            </ol>
            <p>Cada passagem mantém contexto, autoria e evidência associados ao mesmo percurso.</p>
          </aside>
        </section>

        <section id="como-funciona" className="explanation" aria-labelledby="explanation-title">
          <p className="section-label">Como funciona</p>
          <div>
            <h2 id="explanation-title">Do registro disperso a uma história que pode ser verificada.</h2>
            <p>
              O Angico organiza observações e ações em uma linha do tempo comum. Lacunas continuam
              visíveis, evidências permanecem ligadas à origem e cada equipe sabe onde retomar o
              trabalho.
            </p>
          </div>
        </section>

        <section id="contato" className="contact" aria-labelledby="contact-title">
          <div>
            <p className="section-label">Contato</p>
            <h2 id="contact-title">Converse sobre o seu território.</h2>
            <p>Conte qual percurso precisa ser registrado, acompanhado ou comprovado.</p>
          </div>

          {contactApiUrl ? (
            <form aria-label="Contato" action={contactApiUrl} method="post">
              <label>
                Nome
                <input name="name" autoComplete="name" required />
              </label>
              <label>
                E-mail
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                Mensagem
                <textarea name="message" rows={4} required />
              </label>
              <button type="submit">Enviar mensagem</button>
            </form>
          ) : (
            <p className="availability-note">O canal de contato está temporariamente indisponível.</p>
          )}
        </section>
      </main>

      <footer>
        <span>Angico</span>
        <span>Memória que transforma ação em continuidade.</span>
      </footer>
    </div>
  );
}
