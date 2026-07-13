import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ENVIRONMENTAL_CONTEXT_BOUNDARY,
  environmentalIndicators
} from '../data/environmentalIndicators';
import EnvironmentalContext from './EnvironmentalContext';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EnvironmentalContext', () => {
  it('presents public context with an explicit honesty boundary', () => {
    render(<EnvironmentalContext />);

    const section = screen.getByRole('region', {
      name: 'Quando o território muda, quem vive nele sente primeiro.'
    });
    expect(within(section).getByText(/Contexto climático do território/)).toBeInTheDocument();
    expect(
      within(section).getByRole('heading', {
        level: 2,
        name: 'Quando o território muda, quem vive nele sente primeiro.'
      })
    ).toBeInTheDocument();
    expect(within(section).getByRole('note')).toHaveTextContent(ENVIRONMENTAL_CONTEXT_BOUNDARY);
    expect(section).toHaveTextContent(
      'Dados públicos ajudam a dimensionar a pressão. O Angico organiza o que cada comunidade percebe, prioriza, faz e comprova no lugar.'
    );
    expect(section).toHaveTextContent('Atualizado em julho de 2026');
    expect(section).not.toHaveTextContent(/impacto do Angico|resultado gerado pelo Angico/i);
  });

  it('renders four indicators in canonical order with complete context', () => {
    render(<EnvironmentalContext />);

    const ledger = screen.getByRole('list', { name: 'Indicadores climáticos públicos' });
    const items = within(ledger).getAllByRole('listitem');
    expect(items).toHaveLength(4);

    environmentalIndicators.forEach((indicator, index) => {
      const scope = within(items[index]);
      expect(scope.getByRole('heading', { level: 3, name: indicator.title })).toBeInTheDocument();
      expect(scope.getByText(indicator.code)).toBeInTheDocument();
      expect(scope.getByText(indicator.value)).toBeInTheDocument();
      expect(scope.getByText(indicator.unit)).toBeInTheDocument();
      expect(scope.getByText(indicator.geography)).toBeInTheDocument();
      expect(scope.getByText(indicator.period)).toBeInTheDocument();
      expect(scope.getByText(indicator.statement)).toBeInTheDocument();
      expect(scope.getByText(indicator.caveat)).toBeInTheDocument();
      expect(scope.getByText('No território')).toBeInTheDocument();
      expect(scope.getByText(indicator.localSignal)).toBeInTheDocument();
    });
  });

  it('gives every source a contextual name and safe external-link attributes', () => {
    render(<EnvironmentalContext />);

    for (const indicator of environmentalIndicators) {
      for (const source of indicator.sources) {
        const link = screen.getByRole('link', {
          name: `Fonte: ${source.label} — ${indicator.title}`
        });
        expect(link).toHaveAttribute('href', source.url);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer');
      }
    }
    expect(screen.getAllByRole('link', { name: /^Fonte:/ })).toHaveLength(5);
  });

  it('renders entirely from the local snapshot without fetching sources', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<EnvironmentalContext />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
