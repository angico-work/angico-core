import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Site from './Site';

const urls = {
  appUrl: 'https://app.angico.test',
  contactApiUrl: 'https://contact.angico.test/messages'
};

afterEach(cleanup);

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
    expect(within(steps[0]).getByRole('link', { name: '1. Território' })).toHaveAttribute(
      'href',
      '#etapa-territorio'
    );
    expect(within(steps[1]).getByRole('link', { name: '2. Observação ou potencialidade' })).toBeInTheDocument();
    expect(within(steps[2]).getByRole('link', { name: '3. Missão' })).toBeInTheDocument();
    expect(within(steps[3]).getByRole('link', { name: '4. Ação' })).toBeInTheDocument();
    expect(within(steps[4]).getByRole('link', { name: '5. Evidência' })).toBeInTheDocument();
    expect(within(steps[5]).getByRole('link', { name: '6. Resultado' })).toBeInTheDocument();
    expect(within(steps[6]).getByRole('link', { name: '7. Indicador' })).toBeInTheDocument();
    expect(screen.queryByText(/^Coleta$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Destino$/i)).not.toBeInTheDocument();
  });

  it('submits contact details only to the configured public endpoint', () => {
    render(<Site {...urls} />);

    const form = screen.getByRole('form', { name: 'Contato' });
    expect(form).toHaveAttribute('action', urls.contactApiUrl);
    expect(form).toHaveAttribute('method', 'post');
    expect(screen.getByLabelText('Nome')).toHaveAttribute('name', 'name');
    expect(screen.getByLabelText('Nome')).toBeRequired();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('name', 'email');
    expect(screen.getByLabelText('E-mail')).toBeRequired();
    expect(screen.getByLabelText('Mensagem')).toHaveAttribute('name', 'message');
    expect(screen.getByLabelText('Mensagem')).toBeRequired();
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
