import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProfileModal from './ProfileModal';

vi.mock('../lib/api', () => ({ updateProfile: vi.fn() }));

const profile = {
  id: 7,
  workspaceId: 'workspace-a',
  nome: 'Ana',
  papel: 'MEMBER',
  angicoId: 'ana.sp',
  telefone: null,
  foto: null,
  createdAt: ''
};

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Editar conta</button>
      {open && <ProfileModal profile={profile} onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />}
    </>
  );
}

afterEach(cleanup);

describe('ProfileModal accessibility', () => {
  it('traps the profile in a named modal and restores focus on Escape', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Editar conta' });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Editar perfil' });
    expect(screen.getByLabelText('Nome *')).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
