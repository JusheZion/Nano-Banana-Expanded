import { act, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromptLibraryPortal } from './PromptLibraryPortal';
import type { PromptRecord } from './lib/types';

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  fetchPrompts: vi.fn(),
}));

vi.mock('@/shared/context/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {},
}));

vi.mock('./lib/promptRepository', () => ({
  deletePrompt: vi.fn(),
  fetchPrompts: mocks.fetchPrompts,
  savePrompt: vi.fn(),
  toggleFavorite: vi.fn(),
}));

const databasePrompt: PromptRecord = {
  id: 'private-prompt',
  title: 'Private account prompt',
  promptText: 'Only the signed-in owner should see this.',
  category: 'character',
  notes: '',
  model: '',
  status: 'draft',
  isFavorite: false,
  tags: [],
  collections: [],
  characters: [],
  looks: [],
  scenes: [],
  variables: [],
  versions: [],
  sourcePortal: '',
  sourceLabel: '',
  createdAt: '2026-10-11T00:00:00.000Z',
  updatedAt: '2026-10-11T00:00:00.000Z',
};

describe('PromptLibraryPortal authentication lifecycle', () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.fetchPrompts.mockReset();
  });

  it('does not publish a signed-in refresh after the user signs out', async () => {
    let resolveFetch: ((prompts: PromptRecord[]) => void) | undefined;
    mocks.fetchPrompts.mockReturnValue(
      new Promise<PromptRecord[]>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    mocks.user = { id: 'account-a' } as User;

    const view = render(<PromptLibraryPortal />);
    await waitFor(() => expect(mocks.fetchPrompts).toHaveBeenCalledTimes(1));

    mocks.user = null;
    view.rerender(<PromptLibraryPortal />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Kron base profile/ })).toBeTruthy());

    await act(async () => {
      resolveFetch?.([databasePrompt]);
      await Promise.resolve();
    });

    expect(screen.queryByText('Private account prompt')).toBeNull();
    expect(screen.getByText('Demo library loaded. Sign in to persist Prompt Library records.')).toBeTruthy();
  });

  it('lets the current account win when an earlier account resolves last', async () => {
    const resolvers = new Map<string, (prompts: PromptRecord[]) => void>();
    mocks.fetchPrompts.mockImplementation((_client: unknown, user: User) =>
      new Promise<PromptRecord[]>((resolve) => {
        resolvers.set(user.id, resolve);
      }),
    );
    mocks.user = { id: 'account-a' } as User;

    const view = render(<PromptLibraryPortal />);
    await waitFor(() => expect(resolvers.has('account-a')).toBe(true));

    mocks.user = { id: 'account-b' } as User;
    view.rerender(<PromptLibraryPortal />);
    await waitFor(() => expect(resolvers.has('account-b')).toBe(true));

    await act(async () => {
      resolvers.get('account-b')?.([{ ...databasePrompt, id: 'account-b-prompt', title: 'Account B prompt' }]);
      await Promise.resolve();
    });
    expect(screen.getAllByText('Account B prompt').length).toBeGreaterThan(0);

    await act(async () => {
      resolvers.get('account-a')?.([databasePrompt]);
      await Promise.resolve();
    });
    expect(screen.queryAllByText('Private account prompt')).toHaveLength(0);
    expect(screen.getAllByText('Account B prompt').length).toBeGreaterThan(0);
  });
});
