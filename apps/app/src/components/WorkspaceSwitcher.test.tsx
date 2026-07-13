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
        workspaces={[{ slug: 'workspace-a', nome: 'Território A', role: 'OWNER' }]}
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
          { slug: 'workspace-a', nome: 'Território A', role: 'OWNER' },
          { slug: 'coletivo-jardim-novo', nome: 'Dados de demonstração', role: 'OWNER' }
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

  it('uses disclosure semantics and restores focus after Escape', () => {
    render(
      <WorkspaceSwitcher
        workspaces={[
          { slug: 'workspace-a', nome: 'Território A', role: 'OWNER' },
          { slug: 'workspace-b', nome: 'Território B', role: 'OWNER' }
        ]}
        activeSlug="workspace-a"
        onSwitch={() => undefined}
        onCreate={async () => undefined}
        onDelete={async () => undefined}
      />
    );
    const trigger = screen.getByRole('button', { name: /Espaço de trabalho/ });
    expect(trigger).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(trigger);
    const option = screen.getByRole('button', { name: 'Território B' });
    option.focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'Território B' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps membership inspection read-only for a viewer', async () => {
    render(
      <WorkspaceSwitcher
        workspaces={[{ slug: 'workspace-a', nome: 'Território A', role: 'VIEWER' }]}
        activeSlug="workspace-a"
        onSwitch={() => undefined}
        onCreate={async () => undefined}
        onDelete={async () => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Espaço de trabalho/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Membros' }));

    expect(await screen.findByRole('dialog', { name: 'Membros · Território A' })).toBeInTheDocument();
    expect(screen.getByText(/consultar os membros/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Adicionar por Angico ID')).not.toBeInTheDocument();
  });
});
