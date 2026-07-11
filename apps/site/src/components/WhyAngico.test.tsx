import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import WhyAngico from './WhyAngico';

afterEach(cleanup);

describe('WhyAngico', () => {
  it('keeps the differentiators and operating path concise and ordered', () => {
    render(<WhyAngico />);

    const differences = screen.getByRole('list', { name: 'Diferenciais do Angico' });
    const differenceItems = within(differences).getAllByRole('listitem');
    expect(differenceItems).toHaveLength(3);
    expect(within(differenceItems[0]).getByText('Território com contexto')).toBeInTheDocument();
    expect(within(differenceItems[1]).getByText('Evidência com autoria')).toBeInTheDocument();
    expect(within(differenceItems[2]).getByText('Rastro sem lacunas ocultas')).toBeInTheDocument();

    const journey = screen.getByRole('list', { name: 'Como o Angico funciona' });
    expect(within(journey).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Observar'),
      expect.stringContaining('Agir'),
      expect.stringContaining('Comprovar'),
      expect.stringContaining('Continuar')
    ]);
    expect(
      screen.getByText('O site demonstra o princípio. O aplicativo autenticado guarda o trabalho.')
    ).toBeInTheDocument();
  });
});
