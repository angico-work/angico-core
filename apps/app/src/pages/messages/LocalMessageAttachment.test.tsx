import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMessageAttachmentFile } from '../../lib/offlineStore';
import { LocalMessageAttachment } from './LocalMessageAttachment';

vi.mock('../../lib/offlineStore', () => ({ getMessageAttachmentFile: vi.fn() }));

const attachment = {
  blobKey: 'blob-1',
  name: 'registro.txt',
  type: 'text/plain',
  size: 120
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('LocalMessageAttachment', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:local-1'),
      revokeObjectURL: vi.fn()
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('reports an unavailable file when local storage rejects the read', async () => {
    vi.mocked(getMessageAttachmentFile).mockRejectedValue(new Error('indexeddb indisponível'));
    render(<LocalMessageAttachment attachment={attachment} ownerId="ana" workspaceId="campo" />);

    expect(await screen.findByText(/arquivo indisponível/)).toBeInTheDocument();
  });

  it('does not create an object URL after the attachment unmounts', async () => {
    const load = deferred<File | undefined>();
    vi.mocked(getMessageAttachmentFile).mockReturnValue(load.promise);
    const view = render(
      <LocalMessageAttachment attachment={attachment} ownerId="ana" workspaceId="campo" />
    );

    view.unmount();
    await act(async () => {
      load.resolve(new File(['registro'], 'registro.txt', { type: 'text/plain' }));
    });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
