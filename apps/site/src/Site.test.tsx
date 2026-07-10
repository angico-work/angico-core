import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Site from './Site';

const urls = {
  appUrl: 'https://app.angico.test',
  contactApiUrl: 'https://contact.angico.test/messages'
};

afterEach(cleanup);

describe('Site', () => {
  it('presents the public proposition with the configured app link', () => {
    render(<Site {...urls} />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Memória territorial para ações que precisam permanecer.'
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Acessar o Angico' })).toHaveAttribute(
      'href',
      urls.appUrl
    );
  });

  it('submits contact details to the configured public endpoint', () => {
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
});
