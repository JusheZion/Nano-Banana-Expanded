import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PromptLibraryPortal } from './PromptLibraryPortal';

vi.mock('@/shared/context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

describe('PromptLibraryPortal', () => {
  it('copies the selected prompt from the header action without opening the editor', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<PromptLibraryPortal />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt to clipboard' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('Kron');
    expect(screen.queryByRole('dialog', { name: 'Prompt editor' })).toBeNull();
    expect(screen.getByText('Prompt copied.')).toBeTruthy();
  });

  it('falls back when browser clipboard permission is denied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Write permission denied.'));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });

    render(<PromptLibraryPortal />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt to clipboard' }));

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith('copy'));
    expect(screen.queryByRole('dialog', { name: 'Prompt editor' })).toBeNull();
    expect(screen.getByText('Prompt copied.')).toBeTruthy();
  });

  it('combines selected prompts into a new selected library prompt', async () => {
    render(<PromptLibraryPortal />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Kron base profile for combine' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Kron temple reveal for combine' }));

    expect(screen.getByText('2/3 selected')).toBeTruthy();
    expect(screen.getByText('Combined: Kron base profile + Kron temple reveal')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Save combined prompt' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Combined: Kron base profile + Kron temple reveal' })).toBeTruthy());
    expect(screen.getByText('0/3 selected')).toBeTruthy();
    expect(screen.getByText(/Combined 2 prompts into/)).toBeTruthy();
    expect(screen.getByText(/## Source 1: Kron base profile/)).toBeTruthy();
    expect(screen.getByText(/## Source 2: Kron temple reveal/)).toBeTruthy();
  });

  it('supports shortcut multi-select from prompt rows', () => {
    render(<PromptLibraryPortal />);

    fireEvent.click(screen.getByRole('button', { name: /Kron base profile/ }), { ctrlKey: true });
    fireEvent.click(screen.getByRole('button', { name: /Kron temple reveal/ }), { metaKey: true });

    expect(screen.getByText('2/3 selected')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Save combined prompt' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('supports shift range selection from prompt rows', () => {
    render(<PromptLibraryPortal />);

    fireEvent.keyDown(screen.getByRole('button', { name: /Kron base profile/ }), { key: ' ' });
    fireEvent.click(screen.getByRole('button', { name: /Ceremonial armor/ }), { shiftKey: true });

    expect(screen.getByText('3/3 selected')).toBeTruthy();
    expect(screen.getByText('Combined: Kron base profile + Kron temple reveal + 1 more')).toBeTruthy();
  });
});
