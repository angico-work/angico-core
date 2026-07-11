import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AnimatedLeafFooter from './AnimatedLeafFooter';

afterEach(cleanup);

describe('AnimatedLeafFooter', () => {
  it('keeps essential footer content and exposes exactly one decorative leaf', () => {
    const { container } = render(<AnimatedLeafFooter />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Angico, voltar ao início' })).toHaveAttribute(
      'href',
      '#inicio'
    );
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute(
      'href',
      '#conteudo'
    );
    expect(
      screen.getByRole('link', { name: 'Angico, voltar ao início' }).querySelector('img')
    ).toHaveAttribute('src', '/angico-logo-white.png');
    const leaves = container.querySelectorAll('.footer-leaf');
    expect(leaves).toHaveLength(1);
    expect(leaves[0]).toHaveAttribute('aria-hidden', 'true');
  });
});
