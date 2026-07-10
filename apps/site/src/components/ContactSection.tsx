import { useState } from 'react';
import type { FormEvent } from 'react';

interface ContactSectionProps {
  appUrl: string;
  contactApiUrl: string;
}

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactSection({ appUrl, contactApiUrl }: ContactSectionProps) {
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionState === 'submitting') {
      return;
    }

    const form = event.currentTarget;
    setSubmissionState('submitting');

    try {
      const response = await fetch(contactApiUrl, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });

      if (!response.ok) {
        throw new Error('Falha no envio do contato.');
      }

      form.reset();
      setSubmissionState('success');
    } catch {
      setSubmissionState('error');
    }
  }

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
        <form
          aria-label="Contato"
          aria-busy={submissionState === 'submitting'}
          onSubmit={handleSubmit}
        >
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
          <button type="submit" disabled={submissionState === 'submitting'}>
            {submissionState === 'submitting'
              ? 'Enviando…'
              : submissionState === 'error'
                ? 'Tentar novamente'
                : 'Enviar mensagem'}
          </button>
          {submissionState === 'submitting' && (
            <p className="form-feedback" role="status">
              Enviando mensagem…
            </p>
          )}
          {submissionState === 'success' && (
            <p className="form-feedback form-feedback-success" role="status">
              Mensagem enviada.
            </p>
          )}
          {submissionState === 'error' && (
            <p className="form-feedback form-feedback-error" role="alert">
              Não foi possível enviar. Revise sua conexão e tente novamente.
            </p>
          )}
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
