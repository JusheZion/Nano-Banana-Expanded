import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImageshopProductionBoard } from '@/portals/storyline/components/ImageshopProductionBoard';

describe('ImageshopProductionBoard', () => {
  it('renders grouped page and panel versions with accessible workflow actions', () => {
    const onSelectVersion = vi.fn();
    const onRevertVersion = vi.fn();
    const onApprove = vi.fn();
    const onPublish = vi.fn();

    render(
      <ImageshopProductionBoard
        board={{
          issueTitle: 'Board Issue',
          pages: [
            {
              pageNumber: 2,
              summary: 'The observatory wakes.',
              panels: [
                {
                  queueItemId: 'issue-board-page-2-panel-3',
                  pageNumber: 2,
                  panelNumber: 3,
                  prompt: 'Flux sees the engine.',
                  status: 'approved',
                  productionItemId: 'production-1',
                  currentVersionId: 'version-1',
                  versions: [
                    {
                      id: 'version-2',
                      kind: 'refined',
                      imageUrl: 'data:image/png;base64,second',
                      prompt: 'Second pass.',
                      model: 'pro',
                      seed: 22,
                      createdAt: '2026-06-05T12:02:00.000Z',
                    },
                    {
                      id: 'version-1',
                      kind: 'generated',
                      imageUrl: 'data:image/png;base64,first',
                      prompt: 'First pass.',
                      model: 'pro',
                      seed: 11,
                      createdAt: '2026-06-05T12:01:00.000Z',
                    },
                  ],
                },
              ],
            },
          ],
        }}
        onSelectVersion={onSelectVersion}
        onRevertVersion={onRevertVersion}
        onApprove={onApprove}
        onPublish={onPublish}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Page 2' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Panel 3' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Choose version 1 for Page 2 Panel 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revert Page 2 Panel 3 to version 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve Page 2 Panel 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish Page 2 Panel 3' }));

    expect(onSelectVersion).toHaveBeenCalledWith('production-1', 'version-2');
    expect(onRevertVersion).toHaveBeenCalledWith('production-1', 'version-2');
    expect(onApprove).toHaveBeenCalledWith('production-1');
    expect(onPublish).toHaveBeenCalledWith('production-1');
  });
});
