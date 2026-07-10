import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Site from './Site';

const urls = {
  appUrl: 'https://app.angico.test',
  contactApiUrl: 'https://contact.angico.test/messages'
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Site', () => {
  it('presents Angico as territorial operational memory and links to the app', () => {
    render(<Site {...urls} />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'A ação acontece hoje. O território precisa lembrar amanhã.'
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar no aplicativo' })).toHaveAttribute(
      'href',
      urls.appUrl
    );
    expect(screen.getByText(/registros dispersos em memória coletiva/i)).toBeInTheDocument();
  });

  it('renders the versioned Angico identity assets', () => {
    render(<Site {...urls} />);

    expect(screen.getByRole('link', { name: 'Angico, início' }).querySelector('img')).toHaveAttribute(
      'src',
      '/angico-leaf-ink.png'
    );
    expect(
      screen.getByRole('link', { name: 'Angico, voltar ao início' }).querySelector('img')
    ).toHaveAttribute('src', '/angico-logo-white.png');
  });

  it('explains the complete socioenvironmental trace in canonical order', () => {
    render(<Site {...urls} />);

    const trace = screen.getByRole('list', { name: 'Percurso do impacto socioambiental' });
    const steps = within(trace).getAllByRole('listitem');

    expect(steps).toHaveLength(7);
    expect(within(trace).queryByRole('link')).not.toBeInTheDocument();
    expect(within(steps[0]).getByText('Território')).toBeInTheDocument();
    expect(within(steps[1]).getByText('Observação ou potencialidade')).toBeInTheDocument();
    expect(within(steps[2]).getByText('Missão')).toBeInTheDocument();
    expect(within(steps[3]).getByText('Ação')).toBeInTheDocument();
    expect(within(steps[4]).getByText('Evidência')).toBeInTheDocument();
    expect(within(steps[5]).getByText('Resultado')).toBeInTheDocument();
    expect(within(steps[6]).getByText('Indicador')).toBeInTheDocument();
    expect(screen.queryByText(/^Coleta$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Destino$/i)).not.toBeInTheDocument();
  });

  it('submits contact details with fetch and reports success without native navigation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    render(<Site {...urls} />);

    const form = screen.getByRole('form', { name: 'Contato' });
    const name = screen.getByLabelText('Nome');
    const email = screen.getByLabelText('E-mail');
    const message = screen.getByLabelText('Mensagem');

    fireEvent.change(name, { target: { value: 'Ana Silva' } });
    fireEvent.change(email, { target: { value: 'ana@example.com' } });
    fireEvent.change(message, { target: { value: 'Precisamos preservar o rastro desta ação.' } });
    fireEvent.submit(form);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [endpoint, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = options.body as FormData;

    expect(form).not.toHaveAttribute('action');
    expect(endpoint).toBe(urls.contactApiUrl);
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ Accept: 'application/json' });
    expect(Object.fromEntries(body.entries())).toEqual({
      name: 'Ana Silva',
      email: 'ana@example.com',
      message: 'Precisamos preservar o rastro desta ação.'
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Mensagem enviada.');
    expect(name).toHaveValue('');
    expect(email).toHaveValue('');
    expect(message).toHaveValue('');
  });

  it('announces submission progress and prevents duplicate contact requests', async () => {
    let resolveRequest!: (response: { ok: boolean }) => void;
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<{ ok: boolean }>((resolve) => {
        resolveRequest = resolve;
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<Site {...urls} />);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Mensagem' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Contato' }));

    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Enviando mensagem…');
    fireEvent.submit(screen.getByRole('form', { name: 'Contato' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRequest({ ok: true });
    await screen.findByText('Mensagem enviada.');
  });

  it('preserves contact content and announces an error when submission fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<Site {...urls} />);

    const name = screen.getByLabelText('Nome');
    const email = screen.getByLabelText('E-mail');
    const message = screen.getByLabelText('Mensagem');

    fireEvent.change(name, { target: { value: 'Ana Silva' } });
    fireEvent.change(email, { target: { value: 'ana@example.com' } });
    fireEvent.change(message, { target: { value: 'Não perca este texto.' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Contato' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível enviar. Revise sua conexão e tente novamente.'
    );
    expect(name).toHaveValue('Ana Silva');
    expect(email).toHaveValue('ana@example.com');
    expect(message).toHaveValue('Não perca este texto.');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled();
  });

  it('does not render a form or implicit destinations when public URLs are absent', () => {
    render(<Site appUrl="" contactApiUrl="" />);

    expect(screen.queryByRole('form', { name: 'Contato' })).not.toBeInTheDocument();
    expect(screen.getByText('O acesso ao aplicativo está temporariamente indisponível.')).toBeInTheDocument();
    expect(screen.getByText('O formulário só será exibido quando houver um destino público configurado.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Entrar no aplicativo' })).not.toBeInTheDocument();
  });

  it('states the public and authenticated product boundary', () => {
    render(<Site {...urls} />);

    expect(
      screen.getByRole('heading', { name: 'O site explica. O aplicativo guarda o trabalho.' })
    ).toBeInTheDocument();
    expect(screen.getByText(/não consulta nem exibe registros operacionais/i)).toBeInTheDocument();
  });
});
