import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TerritoryAtlas from './TerritoryAtlas';

afterEach(cleanup);

describe('TerritoryAtlas', () => {
  it('frames a complete demonstrative atlas with cartographic marginalia', () => {
    const { container } = render(<TerritoryAtlas />);

    expect(
      screen.getByRole('figure', { name: 'Atlas demonstrativo — sem dados operacionais' })
    ).toHaveAccessibleDescription(
      'Prancha demonstrativa com limite territorial, relevo, área de drenagem, água, vegetação, fragmentos, cicatriz de fogo, caminhos, travessia, escola, praça, ponto comunitário, alagamento, calor, falta de sombra, grade, norte, escala e Rastro.'
    );
    expect(screen.getByText('Atlas demonstrativo — sem dados operacionais')).toBeInTheDocument();
    expect(screen.getByText(/Norte/)).toBeInTheDocument();
    expect(screen.getByText('0 · 250 · 500 m')).toBeInTheDocument();
    expect(screen.getByText('Grade A–D / 1–4')).toBeInTheDocument();

    const svg = container.querySelector('.a-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 1200 760');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
    expect(svg).toHaveAttribute('aria-hidden', 'true');

    for (const layer of [
      'drainage',
      'water',
      'vegetation',
      'fragments',
      'fire',
      'paths',
      'signals'
    ]) {
      expect(container.querySelector(`[data-layer="${layer}"]`)).toBeInTheDocument();
    }
    expect(container.querySelectorAll('[data-grid-axis]')).toHaveLength(8);
    expect(container).toHaveTextContent('Escola');
    expect(container).toHaveTextContent('Praça');
    expect(container).toHaveTextContent('Ponto comunitário');
    expect(container).toHaveTextContent('Travessia');
    expect(container).toHaveTextContent('Calor');
    expect(container).toHaveTextContent('Sem sombra');
  });

  it('keeps legend and the four-step Rastro outside the SVG semantics', () => {
    render(<TerritoryAtlas />);

    const legend = screen.getByRole('list', { name: 'Camadas do atlas demonstrativo' });
    expect(within(legend).getAllByRole('listitem')).toHaveLength(5);
    expect(within(legend).getByText('Água')).toBeInTheDocument();
    expect(within(legend).getByText('Vegetação')).toBeInTheDocument();
    expect(within(legend).getByText('Pressão')).toBeInTheDocument();
    expect(within(legend).getByText('Caminho')).toBeInTheDocument();
    expect(within(legend).getByText('Registro')).toBeInTheDocument();

    const trace = screen.getByRole('list', { name: 'Percurso demonstrativo do território' });
    const steps = within(trace).getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    expect(within(steps[0]).getByText('Observação')).toBeInTheDocument();
    expect(within(steps[1]).getByText('Ação')).toBeInTheDocument();
    expect(within(steps[2]).getByText('Evidência')).toBeInTheDocument();
    expect(within(steps[3]).getByText('Resultado')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sinais locais: escola · praça · ponto comunitário · travessia · alagamento · calor · falta de sombra'
      )
    ).toBeInTheDocument();
  });

  it('does not place public climate figures inside the demonstrative territory', () => {
    const { container } = render(<TerritoryAtlas />);
    expect(container).not.toHaveTextContent(/775 mil|58,7 mi|5\.097|60%/i);
  });
});
