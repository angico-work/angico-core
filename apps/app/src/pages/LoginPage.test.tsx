import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import LoginPage from './LoginPage';

afterEach(cleanup);

describe('LoginPage', () => {
  it('starts with empty credentials and discloses no demo account', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('E-mail')).toHaveValue('');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(screen.queryByText(/julia@angico\.demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/angico-demo/i)).not.toBeInTheDocument();
  });
});
