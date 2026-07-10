interface ContactSectionProps {
  appUrl: string;
  contactApiUrl: string;
}

export default function ContactSection({ appUrl, contactApiUrl }: ContactSectionProps) {
  return (
    <section id="contato" className="contact site-frame" aria-labelledby="contact-title">
      <div className="contact-heading">
        <p className="section-label">05 / Contato</p>
        <h2 id="contact-title">Existe um percurso que precisa ganhar memória?</h2>
        <p>
          Conte qual ação, território ou resultado precisa ser registrado, acompanhado ou
          comprovado.
        </p>
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
            <textarea name="message" rows={5} required />
          </label>
          <button type="submit">Enviar mensagem</button>
        </form>
      ) : (
        <div className="contact-unavailable">
          <p className="register-code">Canal em preparação</p>
          <p>O formulário só será exibido quando houver um destino público configurado.</p>
          {appUrl && (
            <a className="text-action" href={appUrl}>
              Ir para o aplicativo
            </a>
          )}
        </div>
      )}
    </section>
  );
}
