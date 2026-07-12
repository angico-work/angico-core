import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AnimatedLeafFooter from './AnimatedLeafFooter';

afterEach(cleanup);

describe('AnimatedLeafFooter', () => {
  it('keeps essential content and renders twelve deterministic official leaves', () => {
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

    const stage = container.querySelector('.leaf-stage');
    const leaves = Array.from(container.querySelectorAll<HTMLElement>('.leaf'));
    expect(stage).toHaveAttribute('aria-hidden', 'true');
    expect(leaves).toHaveLength(12);
    expect(new Set(leaves.map((leaf) => leaf.dataset.trajectory))).toEqual(
      new Set(['left', 'center', 'right'])
    );
    for (const leaf of leaves) {
      expect(leaf.style.getPropertyValue('--leaf-x')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-size')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-duration')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-delay')).toMatch(/^-/);
      expect(leaf.style.getPropertyValue('--leaf-opacity')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-rest')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-start-x')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-end-r')).not.toBe('');
    }
    const sizes = leaves.map((leaf) =>
      Number.parseFloat(leaf.style.getPropertyValue('--leaf-size'))
    );
    const opacities = leaves.map((leaf) =>
      Number.parseFloat(leaf.style.getPropertyValue('--leaf-opacity'))
    );
    const positions = leaves.map((leaf) =>
      Number.parseFloat(leaf.style.getPropertyValue('--leaf-x'))
    );
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(26);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(72);
    expect(Math.min(...opacities)).toBeGreaterThanOrEqual(.18);
    expect(Math.max(...opacities)).toBeLessThanOrEqual(.62);
    expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThanOrEqual(60);
  });
});
