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
});
