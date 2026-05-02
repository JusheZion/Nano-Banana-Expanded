import { beforeEach, describe, expect, it } from 'vitest';
import { useImageWorkshopBridge } from '@/stores/imageWorkshopBridge';

beforeEach(() => {
  useImageWorkshopBridge.setState({
    portalToOpen: null,
    draft: null,
    guidedHandoff: null,
    guidedPanelReturn: null,
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

  it('opens the lab portal and stores guided comic references', () => {
    useImageWorkshopBridge.getState().requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'visual-prep',
      sourceLabel: 'Guided Comic Flow · Visual Prep',
      characters: [
        {
          name: 'flux',
          displayName: 'Flux',
          imageUrl: 'https://example.com/flux.png',
          referenceId: 'flux-ref',
        },
      ],
      locations: [],
    });

    expect(useImageWorkshopBridge.getState().portalToOpen).toBe('lab');
    expect(useImageWorkshopBridge.getState().guidedHandoff?.characters[0].displayName).toBe('Flux');
  });

  it('clears only the portal request for guided comic handoffs', () => {
    useImageWorkshopBridge.getState().requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'visual-prep',
      sourceLabel: 'Guided Comic Flow · Visual Prep',
      characters: [],
      locations: [],
    });

    useImageWorkshopBridge.getState().clearPortalRequest();

    expect(useImageWorkshopBridge.getState().portalToOpen).toBeNull();
    expect(useImageWorkshopBridge.getState().guidedHandoff).not.toBeNull();
  });

  it('consumes guided comic handoffs once', () => {
    useImageWorkshopBridge.getState().requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'visual-prep',
      sourceLabel: 'Guided Comic Flow · Visual Prep',
      characters: [],
      locations: [
        {
          name: 'sky temple',
          displayName: 'Sky Temple',
          imageUrl: 'https://example.com/temple.png',
        },
      ],
    });

    const out = useImageWorkshopBridge.getState().consumeGuidedComicHandoff();

    expect(out?.locations[0].displayName).toBe('Sky Temple');
    expect(useImageWorkshopBridge.getState().guidedHandoff).toBeNull();
    expect(useImageWorkshopBridge.getState().consumeGuidedComicHandoff()).toBeNull();
  });

  it('accepts an empty guided comic handoff without crashing', () => {
    useImageWorkshopBridge.getState().requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'visual-prep',
      sourceLabel: 'Guided Comic Flow · Visual Prep',
      characters: [],
      locations: [],
    });

    const out = useImageWorkshopBridge.getState().consumeGuidedComicHandoff();

    expect(out?.characters).toEqual([]);
    expect(out?.locations).toEqual([]);
  });

  it('stores and consumes guided comic panel handoffs', () => {
    useImageWorkshopBridge.getState().requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'art',
      returnTarget: 'guided-comic-art',
      sourceLabel: 'Guided Comic Flow · Page 2, Panel 3',
      panelId: 'page-2-panel-3',
      pageNumber: 2,
      panelNumber: 3,
      panelBeat: 'Flux discovers the broken sky engine.',
      pageSummary: 'The team enters the observatory.',
      pageKeyCharacters: ['flux', 'elder hayward'],
      pageKeyLocation: 'sky observatory',
      artDirection: {
        artStyle: 'clean superhero comic',
        defaultAspectRatio: 'Match panel layout',
        renderingStyle: 'inked linework with painterly color',
        colorMood: 'electric blues and warm golds',
        lighting: 'dramatic rim light',
        continuityNotes: 'Keep Flux in the same jacket.',
        excludeTextFromImages: true,
      },
      characters: [
        {
          name: 'flux',
          displayName: 'Flux',
          imageUrl: 'https://example.com/flux.png',
        },
      ],
      locations: [
        {
          name: 'sky observatory',
          displayName: 'Sky Observatory',
          imageUrl: 'https://example.com/observatory.png',
        },
      ],
    });

    expect(useImageWorkshopBridge.getState().portalToOpen).toBe('lab');

    const out = useImageWorkshopBridge.getState().consumeGuidedComicHandoff();

    expect(out?.currentStep).toBe('art');
    expect(out?.returnTarget).toBe('guided-comic-art');
    expect(out?.panelId).toBe('page-2-panel-3');
    expect(out?.pageNumber).toBe(2);
    expect(out?.panelNumber).toBe(3);
    expect(out?.panelBeat).toContain('sky engine');
    expect(out?.artDirection?.excludeTextFromImages).toBe(true);
    expect(out?.artDirection?.continuityNotes).toContain('same jacket');
    expect(out?.characters).toHaveLength(1);
    expect(out?.locations).toHaveLength(1);
    expect(useImageWorkshopBridge.getState().consumeGuidedComicHandoff()).toBeNull();
  });

  it('stores guided comic panel image returns and opens comic portal', () => {
    useImageWorkshopBridge.getState().sendGuidedComicPanelImageBack({
      panelId: 'page-4-panel-1',
      pageNumber: 4,
      panelNumber: 1,
      imageUrl: 'data:image/png;base64,abc123',
      seed: 42,
      prompt: 'A heroic panel.',
    });

    expect(useImageWorkshopBridge.getState().portalToOpen).toBe('comic');
    expect(useImageWorkshopBridge.getState().guidedPanelReturn?.returnTarget).toBe('guided-comic-art');

    const out = useImageWorkshopBridge.getState().consumeGuidedComicPanelImageReturn();

    expect(out?.panelId).toBe('page-4-panel-1');
    expect(out?.imageUrl).toBe('data:image/png;base64,abc123');
    expect(out?.seed).toBe(42);
    expect(out?.prompt).toBe('A heroic panel.');
    expect(out?.returnedAt).toEqual(expect.any(String));
    expect(useImageWorkshopBridge.getState().consumeGuidedComicPanelImageReturn()).toBeNull();
  });
});
