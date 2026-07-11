import type { ConfigEnv } from 'vite';
import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

describe('production build policy', () => {
  it('emits the asset manifest at a stable public path', async () => {
    const environment: ConfigEnv = {
      command: 'build',
      mode: 'production',
      isSsrBuild: false,
      isPreview: false
    };
    const config = typeof viteConfig === 'function'
      ? await viteConfig(environment)
      : await viteConfig;

    expect(config.build?.manifest).toBe('asset-manifest.json');
  });
});
