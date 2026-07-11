import { describe, expect, it } from 'vitest';
import { computeBuildRevision, type RevisionInput } from '../buildRevision';

const inputs: RevisionInput[] = [
  { name: 'asset-manifest.json', content: '{"entry":"index-a.js"}' },
  { name: 'sw.js', content: 'const CACHE = "__ANGICO_BUILD_REVISION__";' },
  { name: 'index.html', content: '<main>Angico</main>' },
  { name: 'manifest.webmanifest', content: '{"name":"Angico"}' },
  { name: 'angico-icone.png', content: new Uint8Array([1, 2, 3]) }
];

describe('build revision', () => {
  it.each(inputs.map((input) => input.name))(
    'changes when %s changes',
    (name) => {
      const changed = inputs.map((input) => input.name === name
        ? { ...input, content: typeof input.content === 'string' ? `${input.content}x` : new Uint8Array([4, 5, 6]) }
        : input);

      expect(computeBuildRevision(changed)).not.toBe(computeBuildRevision(inputs));
    }
  );
});
