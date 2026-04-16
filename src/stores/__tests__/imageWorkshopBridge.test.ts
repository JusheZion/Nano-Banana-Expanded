import { beforeEach, describe, expect, it } from 'vitest';
import { useImageWorkshopBridge } from '@/stores/imageWorkshopBridge';

beforeEach(() => {
  useImageWorkshopBridge.setState({
    portalToOpen: null,
    draft: null,
  });
});

describe('useImageWorkshopBridge', () => {
  it('opens the lab portal and stores the draft', () => {
    useImageWorkshopBridge.getState().requestWriterHandoff({
      source: {
        sourceLabel: 'Issue #1 · Page 1',
      },
      moodboardPrompts: ['Blue neon alley'],
      items: [],
    });

    expect(useImageWorkshopBridge.getState().portalToOpen).toBe('lab');
    expect(useImageWorkshopBridge.getState().draft?.source.sourceLabel).toBe('Issue #1 · Page 1');
  });

  it('clears only the portal request when asked', () => {
    useImageWorkshopBridge.getState().requestWriterHandoff({
      source: {
        sourceLabel: 'Issue #1 · Page 1',
      },
      moodboardPrompts: ['Blue neon alley'],
      items: [],
    });

    useImageWorkshopBridge.getState().clearPortalRequest();

    expect(useImageWorkshopBridge.getState().portalToOpen).toBeNull();
    expect(useImageWorkshopBridge.getState().draft).not.toBeNull();
  });

  it('clears the draft independently', () => {
    useImageWorkshopBridge.getState().requestWriterHandoff({
      source: {
        sourceLabel: 'Issue #1 · Page 1',
      },
      moodboardPrompts: ['Blue neon alley'],
      items: [],
    });

    useImageWorkshopBridge.getState().clearDraft();

    expect(useImageWorkshopBridge.getState().draft).toBeNull();
  });
});
