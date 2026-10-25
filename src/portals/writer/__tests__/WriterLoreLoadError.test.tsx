import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterLoreLoadError } from '../WriterLoreLoadError';

describe('WriterLoreLoadError', () => {
  it('exposes the read failure and a usable retry action', () => {
    const onRetry = vi.fn();
    render(<WriterLoreLoadError error="read denied" loading={false} onRetry={onRetry} />);

    expect(screen.getByRole('alert').textContent).toContain('Story Canon could not be loaded: read denied');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders nothing when there is no error', () => {
    const { container } = render(
      <WriterLoreLoadError error={null} loading={false} onRetry={() => undefined} />,
    );
    expect(container.innerHTML).toBe('');
  });
});
