import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import OfflineReadNotice from './OfflineReadNotice';
import {
  ACCOUNT_SNAPSHOT_WORKSPACE,
  recordOfflineReadSource,
  resetOfflineReadSources
} from '../lib/offlineReadState';

describe('OfflineReadNotice', () => {
  beforeEach(resetOfflineReadSources);
  afterEach(cleanup);

  it('shows dated snapshot sources only for the active owner, workspace and account partition', () => {
    recordOfflineReadSource({
      ownerId: 'ana.sp', workspaceId: ACCOUNT_SNAPSHOT_WORKSPACE,
      resource: 'workspaces', contractVersion: 1
    }, '2026-07-10T12:00:00Z');
    recordOfflineReadSource({
      ownerId: 'ana.sp', workspaceId: 'territorio-a',
      resource: 'rastro', root: 'MISSAO:1', contractVersion: 1
    }, '2026-07-10T12:01:00Z');
    recordOfflineReadSource({
      ownerId: 'ana.sp', workspaceId: 'territorio-b',
      resource: 'dashboard', contractVersion: 1
    }, '2026-07-10T12:02:00Z');
    recordOfflineReadSource({
      ownerId: 'bia.sp', workspaceId: 'territorio-a',
      resource: 'map-points', contractVersion: 1
    }, '2026-07-10T12:03:00Z');

    render(<OfflineReadNotice ownerId="ana.sp" workspaceId="territorio-a" active />);

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('dados confirmados salvos neste aparelho');
    expect(notice).toHaveTextContent('Espaços de trabalho');
    expect(notice).toHaveTextContent('Rastro');
    expect(screen.getAllByText(/10\/07\/2026/)).toHaveLength(2);
    expect(notice).not.toHaveTextContent('Painel');
    expect(notice).not.toHaveTextContent('Mapa');
  });

  it('hides every stored source when offline access is no longer active', () => {
    recordOfflineReadSource({
      ownerId: 'ana.sp', workspaceId: 'territorio-a',
      resource: 'dashboard', contractVersion: 1
    }, '2026-07-10T12:00:00Z');

    render(<OfflineReadNotice ownerId="ana.sp" workspaceId="territorio-a" active={false} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
