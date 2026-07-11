import { describe, expect, it } from 'vitest';
import { mutationFeedback } from './mutationFeedback';

describe('mutation feedback', () => {
  it('distinguishes confirmed, waiting and review states without claiming a remote record', () => {
    expect(mutationFeedback('SYNCED')).toMatchObject({
      title: 'Sincronização concluída', tone: 'ok'
    });
    expect(mutationFeedback('QUEUED')).toMatchObject({
      title: 'Salvo neste aparelho', tone: 'pending'
    });
    expect(mutationFeedback('CONFLICT')).toMatchObject({
      title: 'Salvo neste aparelho; atenção necessária', tone: 'attention'
    });
    expect(mutationFeedback('ACTION_REQUIRED').description).toContain('protegido localmente');
  });
});
