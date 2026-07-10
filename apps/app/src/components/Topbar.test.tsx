import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Topbar from './Topbar';

afterEach(cleanup);

describe('Topbar synchronization access', () => {
  it('opens a visible synchronization center instead of showing a decorative label', async () => {
    render(
      <Topbar
        workspaceLabel="Território do Sol"
        workspaceId="territorio-sol"
        onToggleSidebar={() => undefined}
        onWorkspaceClick={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir sincronização' }));

    expect(await screen.findByRole('dialog', { name: 'Sincronização' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum registro aguardando envio.')).toBeInTheDocument();
  });
});
