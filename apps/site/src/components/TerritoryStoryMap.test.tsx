import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TerritoryStoryMap from './TerritoryStoryMap';

afterEach(cleanup);

describe('TerritoryStoryMap', () => {
  it('describes a demonstrative four-step trace without operational claims', () => {
    const { container } = render(<TerritoryStoryMap />);

    expect(screen.getByText('Demonstração visual — sem dados operacionais')).toBeInTheDocument();
    const trace = screen.getByRole('list', { name: 'Percurso demonstrativo do território' });
    const steps = within(trace).getAllByRole('listitem');

    expect(steps).toHaveLength(4);
    expect(within(steps[0]).getByText('Observação')).toBeInTheDocument();
    expect(within(steps[1]).getByText('Ação')).toBeInTheDocument();
    expect(within(steps[2]).getByText('Evidência')).toBeInTheDocument();
    expect(within(steps[3]).getByText('Resultado')).toBeInTheDocument();
    expect(container.querySelector('.territory-map__svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container).not.toHaveTextContent(/\d+%|pessoas impactadas|certificado|pontuação/i);
  });
});
