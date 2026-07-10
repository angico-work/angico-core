import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('app entry', () => {
  it('sends an anonymous visitor directly to sign in', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Acessar Angico' })).toBeInTheDocument();
    expect(screen.queryByText('Onde o território aprende a agir e lembrar.')).not.toBeInTheDocument();
  });
});
