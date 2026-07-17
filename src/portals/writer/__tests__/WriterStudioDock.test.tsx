import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { WriterStudioDock } from '@/portals/writer/WriterStudioDock';

vi.mock('@/shared/components/Tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
}));

const DockHarness = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <WriterStudioDock
      activeTabId="library"
      onTabChange={() => undefined}
      library={<p>Library content</p>}
      activity={<p>Activity content</p>}
      help={<p>Help content</p>}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed((current) => !current)}
    />
  );
};

describe('WriterStudioDock', () => {
  it('preserves keyboard focus across collapse and reopen', () => {
    render(<DockHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Hide workshop panels' }), { detail: 0 });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show workshop panels' }));

    fireEvent.click(screen.getByRole('button', { name: 'Show workshop panels' }), { detail: 0 });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Hide workshop panels' }));
  });
});
