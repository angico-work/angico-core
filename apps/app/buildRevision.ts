import { createHash } from 'node:crypto';

export interface RevisionInput {
  name: string;
  content: string | Uint8Array;
}

export function computeBuildRevision(inputs: RevisionInput[]): string {
  const hash = createHash('sha256');
  for (const input of inputs) {
    hash.update(input.name);
    hash.update('\0');
    hash.update(input.content);
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}
