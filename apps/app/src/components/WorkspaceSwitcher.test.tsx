import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkspaceSwitcher from './WorkspaceSwitcher';

vi.mock('../lib/api', () => ({
  addMember: vi.fn(),
  listMembers: vi.fn().mockResolvedValue([]),
  removeMember: vi.fn(),
  searchPessoas: vi.fn().mockResolvedValue([])
}));

afterEach(cleanup);

describe('WorkspaceSwitcher accessibility', () => {
  it('restores focus to the stable trigger after closing the members dialog', async () => {
    render(
      <WorkspaceSwitcher
        workspaces={[{ slug: 'workspace-a', nome: 'Território A' }]}
        activeSlug="workspace-a"
        onSwitch={() => undefined}
        onCreate={async () => undefined}
        onDelete={async () => undefined}
      />
    );
    const trigger = screen.getByRole('button', { name: /Espaço de trabalho/ });
    trigger.focus();
    fireEvent.click(trigger);
    const members = screen.getByRole('button', { name: 'Membros' });
    members.focus();
    fireEvent.click(members);

    const dialog = await screen.findByRole('dialog', { name: 'Membros · Território A' });
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('does not reserve a workspace because its slug matches demo data', () => {
    render(
      <WorkspaceSwitcher
        workspaces={[
          { slug: 'workspace-a', nome: 'Território A' },
          { slug: 'coletivo-jardim-novo', nome: 'Dados de demonstração' }
        ]}
        activeSlug="workspace-a"
        onSwitch={() => undefined}
        onCreate={async () => undefined}
        onDelete={async () => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Espaço de trabalho/ }));

    expect(screen.getByRole('button', { name: 'Remover Dados de demonstração' })).toBeInTheDocument();
  });
});
