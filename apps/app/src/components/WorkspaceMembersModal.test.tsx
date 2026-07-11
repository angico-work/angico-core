import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkspaceMembersModal from './WorkspaceMembersModal';

vi.mock('../lib/api', () => ({
  addMember: vi.fn(),
  listMembers: vi.fn().mockResolvedValue([]),
  removeMember: vi.fn(),
  searchPessoas: vi.fn().mockResolvedValue([])
}));

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Gerenciar membros</button>
      {open && (
        <WorkspaceMembersModal
          slug="workspace-a"
          workspaceName="Território A"
          canManage
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

afterEach(cleanup);

describe('WorkspaceMembersModal accessibility', () => {
  it('closes on Escape and restores focus to the opener', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Gerenciar membros' });
    opener.focus();
    fireEvent.click(opener);

    const dialog = await screen.findByRole('dialog', { name: 'Membros · Território A' });
    expect(screen.getByLabelText('Adicionar por Angico ID')).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
