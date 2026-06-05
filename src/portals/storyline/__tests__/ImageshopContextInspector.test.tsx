import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImageshopContextInspector } from '@/portals/storyline/components/ImageshopContextInspector';
import { createImageshopIssueQueue } from '@/portals/storyline/imageshopPagePanelQueue';

describe('ImageshopContextInspector', () => {
  it('offers canon, reference mutation, and missing-reference route actions', () => {
    const panel = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-05T12:00:00.000Z',
      issue: {
        id: 'issue-inspector',
        title: 'Inspector Issue',
      },
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              action: 'Flux searches for a missing prop.',
              canonChips: [
                {
                  id: 'canon-flux',
                  title: 'Flux',
                  category: 'character',
                  source: 'writer',
                  summary: 'Flux wears a silver jacket.',
                },
              ],
              referenceChips: [
                {
                  id: 'character-flux',
                  label: 'Flux identity',
                  lane: 'character-dna',
                  sourceType: 'character',
                  referenceId: 'character-flux',
                  signedUrlStatus: 'ready',
                },
              ],
            },
          ],
        },
      ],
    }).pages[0].panels[0];
    const onAttachCanon = vi.fn();
    const onDetachCanon = vi.fn();
    const onAddResolvedReferences = vi.fn();
    const onReplaceReferences = vi.fn();
    const onClearReferences = vi.fn();
    const onUndoReferences = vi.fn();
    const onRemoveReference = vi.fn();
    const onResolveMissingReference = vi.fn();

    render(
      <ImageshopContextInspector
        panel={panel}
        loreCards={[
          {
            id: 'lore-key',
            title: 'Helios Key',
            category: 'artifact',
            body: 'The key emits a gold ring.',
            includeInPrompt: true,
          },
        ]}
        resolvedReferenceChips={panel.referenceChips}
        missingReferenceRoutes={[
          {
            referenceId: 'asset-helios-key',
            destination: 'asset-studio',
            label: 'Resolve asset-helios-key in Asset Studio',
          },
        ]}
        canUndoReferences
        onAttachCanon={onAttachCanon}
        onDetachCanon={onDetachCanon}
        onAddResolvedReferences={onAddResolvedReferences}
        onReplaceReferences={onReplaceReferences}
        onClearReferences={onClearReferences}
        onUndoReferences={onUndoReferences}
        onRemoveReference={onRemoveReference}
        onResolveMissingReference={onResolveMissingReference}
      />,
    );

    fireEvent.change(screen.getByLabelText('Lore card to attach'), {
      target: { value: 'lore-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Attach selected lore card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Detach canon Flux' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add resolved references' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace panel references' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear panel references' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo reference change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove reference Flux identity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resolve asset-helios-key in Asset Studio' }));

    expect(onAttachCanon).toHaveBeenCalledWith('lore-key');
    expect(onDetachCanon).toHaveBeenCalledWith('canon-flux');
    expect(onAddResolvedReferences).toHaveBeenCalled();
    expect(onReplaceReferences).toHaveBeenCalled();
    expect(onClearReferences).toHaveBeenCalled();
    expect(onUndoReferences).toHaveBeenCalled();
    expect(onRemoveReference).toHaveBeenCalledWith('character-flux');
    expect(onResolveMissingReference).toHaveBeenCalledWith('asset-studio');
  });
});
