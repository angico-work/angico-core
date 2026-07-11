import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TerritoryHero from './TerritoryHero';

afterEach(cleanup);

describe('TerritoryHero', () => {
  it('leads with the territory and sends interested visitors to contact', () => {
    render(<TerritoryHero />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'O trabalho continua. A memória também.' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Quero levar o Angico ao meu território' })
    ).toHaveAttribute('href', '#contato');
    expect(screen.getByText('Demonstração visual — sem dados operacionais')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Já sou membro' })).not.toBeInTheDocument();
  });
});
