import React, { createRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriterRibbon, type WriterRibbonMenuId } from '../WriterRibbon';

vi.mock('@/shared/components/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/shared/context/ResponsiveLayoutContext', () => ({
  useResponsiveLayout: () => ({
    width: 1280,
    isPhone: false,
    isTablet: false,
    isDesktop: true,
    prefersHoverSidebar: true,
  }),
}));

function Harness() {
  const [activeMenu, setActiveMenu] = useState<WriterRibbonMenuId>('home');
  return (
    <WriterRibbon
      activeMenu={activeMenu}
      onActiveMenu={setActiveMenu}
      workspaceTab="cockpit"
      onWorkspaceTab={vi.fn()}
      findQuery=""
      onFindQuery={vi.fn()}
      findInputRef={createRef<HTMLInputElement>()}
      findMatchCount={0}
      findActiveIndex={0}
      onFindNext={vi.fn()}
      onFindPrev={vi.fn()}
      monospacePre={false}
      onToggleMonospace={vi.fn()}
      textScale="md"
      onTextScale={vi.fn()}
      dockOpen
      onToggleDock={vi.fn()}
      onCopyVisibleText={vi.fn()}
      canCopyVisible={false}
      onRunPacing={vi.fn()}
      onRunCanon={vi.fn()}
      canRunReview={false}
      pacingLoading={false}
      canonLoading={false}
      onQuickGenerate={vi.fn()}
      quickGenerateLabel="Generate"
      quickGenerateDisabled
      quickGenerateLoading={false}
      hasPrevPage={false}
      hasNextPage={false}
      onPrevPage={vi.fn()}
      onNextPage={vi.fn()}
      onOpenHelpCategory={vi.fn()}
    />
  );
}

describe('WriterRibbon menu tabs', () => {
  it('uses a roving tab stop and links the selected tab to its panel', () => {
    render(<Harness />);

    const home = screen.getByRole('tab', { name: 'Home' });
    const file = screen.getByRole('tab', { name: 'File' });
    const panel = screen.getByRole('tabpanel');

    expect(home.getAttribute('tabindex')).toBe('0');
    expect(file.getAttribute('tabindex')).toBe('-1');
    expect(home.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(home.id);
  });

  it('activates and focuses tabs with arrows, Home, and End', () => {
    render(<Harness />);

    const home = screen.getByRole('tab', { name: 'Home' });
    home.focus();
    fireEvent.keyDown(home, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Insert' }));
    expect(screen.getByRole('tab', { name: 'Insert' }).getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Insert' }), { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Help' }));

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Help' }), { key: 'Home' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'File' }));

    fireEvent.keyDown(screen.getByRole('tab', { name: 'File' }), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Help' }));
  });
});
