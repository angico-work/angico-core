import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NewEntityModal from './NewEntityModal';
import { captureObservation } from '../lib/offlineSync';

vi.mock('../lib/offlineSync', () => ({
  captureObservation: vi.fn()
}));

afterEach(cleanup);

describe('field observation capture', () => {
  it('moves through the three explicit field steps without exposing database ids', () => {
    render(
      <NewEntityModal
        workspaceId="territorio-teste"
        initialType="observacao"
        lockType
        onClose={() => undefined}
        onCreated={() => undefined}
      />
    );

    expect(screen.getByText('Registrar')).toBeInTheDocument();
    expect(screen.getByText('Ancorar')).toBeInTheDocument();
    expect(screen.getByText('Comprovar e salvar')).toBeInTheDocument();
    expect(screen.queryByLabelText(/id/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Nascente com resíduos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para ancorar' }));

    expect(screen.getByRole('heading', { name: 'Onde aconteceu?' })).toBeInTheDocument();
  });

  it('keeps a queued observation visible until the person acknowledges its sync state', async () => {
    vi.mocked(captureObservation).mockResolvedValue({
      clientMutationId: 'local-1',
      status: 'QUEUED'
    });
    const onCreated = vi.fn();
    render(
      <NewEntityModal
        workspaceId="territorio-teste"
        initialType="observacao"
        lockType
        onClose={() => undefined}
        onCreated={onCreated}
      />
    );

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Nascente com resíduos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para ancorar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para comprovar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Salva neste aparelho');
    expect(onCreated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });
});
