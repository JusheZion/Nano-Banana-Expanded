import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildGuidedImageWorkshopPrompt,
  buildGuidedImageWorkshopPromptForActiveReferences,
  getGuidedImageWorkshopAspectRatio,
  getGuidedImageWorkshopPreload,
  useImageWorkshopBridge,
} from '@/stores/imageWorkshopBridge';

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
      npcs: [
        {
          name: 'alley witness',
          displayName: 'Alley Witness',
          imageUrl: 'https://example.com/witness.png',
          sourceType: 'npc',
        },
      ],
    });

    expect(useImageWorkshopBridge.getState().portalToOpen).toBe('lab');
    expect(useImageWorkshopBridge.getState().guidedHandoff?.characters[0].displayName).toBe('Flux');
    expect(useImageWorkshopBridge.getState().guidedHandoff?.npcs[0].displayName).toBe('Alley Witness');
  });

  it('clears only the portal request for guided comic handoffs', () => {
    useImageWorkshopBridge.getState().requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'visual-prep',
      sourceLabel: 'Guided Comic Flow · Visual Prep',
      characters: [],
      locations: [],
      npcs: [],
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
      npcs: [],
    });

    const out = useImageWorkshopBridge.getState().consumeGuidedComicHandoff();

    expect(out?.locations[0].displayName).toBe('Sky Temple');
    expect(out?.npcs).toEqual([]);
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
      npcs: [],
    });

    const out = useImageWorkshopBridge.getState().consumeGuidedComicHandoff();

    expect(out?.characters).toEqual([]);
    expect(out?.locations).toEqual([]);
    expect(out?.npcs).toEqual([]);
  });

  it('keeps all guided comic references available while preloading the first 14 slots', () => {
    const handoff = {
      source: 'guided-comic' as const,
      currentStep: 'visual-prep' as const,
      sourceLabel: 'Guided Comic Flow · Visual Prep',
      characters: Array.from({ length: 8 }, (_, index) => ({
        name: `hero ${index + 1}`,
        displayName: `Hero ${index + 1}`,
        imageUrl: `https://example.com/hero-${index + 1}.png`,
        sourceType: 'character' as const,
      })),
      locations: Array.from({ length: 5 }, (_, index) => ({
        name: `location ${index + 1}`,
        displayName: `Location ${index + 1}`,
        imageUrl: `https://example.com/location-${index + 1}.png`,
        sourceType: 'asset' as const,
      })),
      npcs: Array.from({ length: 4 }, (_, index) => ({
        name: `npc ${index + 1}`,
        displayName: `NPC ${index + 1}`,
        imageUrl: `https://example.com/npc-${index + 1}.png`,
        sourceType: 'npc' as const,
      })),
    };

    const preload = getGuidedImageWorkshopPreload(handoff);

    expect(preload.allReferences).toHaveLength(17);
    expect(preload.slotUrls).toHaveLength(14);
    expect(preload.slotUrls[0]).toBe('https://example.com/hero-1.png');
    expect(preload.slotUrls[12]).toBe('https://example.com/location-5.png');
    expect(preload.slotUrls[13]).toBe('https://example.com/npc-1.png');
    expect(preload.allReferences[16].displayName).toBe('NPC 4');
    expect(preload.overflowReferences.map((reference) => reference.displayName)).toEqual([
      'NPC 2',
      'NPC 3',
      'NPC 4',
    ]);
    expect(preload.context).toBe('character');
  });

  it('builds a guided panel Imageshop prompt with panel context, reference labels, art direction, and no-text instruction', () => {
    const prompt = buildGuidedImageWorkshopPrompt({
      source: 'guided-comic',
      currentStep: 'art',
      returnTarget: 'guided-comic-art',
      sourceLabel: 'Guided Comic Flow · Page 2, Panel 1',
      pageNumber: 2,
      panelNumber: 1,
      panelBeat: 'A wide establishing shot of Flux entering the sky observatory.',
      visualPrompt: 'Compose the observatory as a wide reveal with Flux framed against the storm window.',
      dialogueContext: 'FLUX: We are too late.',
      referenceNeeds: {
        characters: ['Flux', 'Mira'],
        locations: ['Sky Observatory'],
        npcs: ['Storm Courier'],
      },
      pageSummary: 'The team reaches the observatory before the storm breaks.',
      pageKeyCharacters: ['Flux', 'Mira'],
      pageKeyLocation: 'Sky Observatory',
      artDirection: {
        artStyle: 'clean superhero comic',
        defaultAspectRatio: 'Match panel layout',
        renderingStyle: 'inked linework with painterly color',
        colorMood: 'electric blues and warm golds',
        lighting: 'dramatic rim light',
        continuityNotes: 'Keep Flux in the same jacket.',
        excludeTextFromImages: true,
      },
      panelLayout: {
        templateId: 'auto',
        intent: 'wide',
        columnSpan: 2,
        rowSpan: 1,
      },
      characters: [
        {
          name: 'flux',
          displayName: 'Flux hero ref',
          imageUrl: 'https://example.com/flux.png',
          sourceType: 'character',
        },
      ],
      locations: [
        {
          name: 'sky observatory',
          displayName: 'Sky Observatory exterior',
          imageUrl: 'https://example.com/observatory.png',
          sourceType: 'asset',
        },
      ],
      npcs: [
        {
          name: 'storm courier',
          displayName: 'Storm Courier',
          imageUrl: 'https://example.com/courier.png',
          sourceType: 'npc',
        },
      ],
    });

    expect(prompt).toContain('Image objective: A wide establishing shot of Flux entering the sky observatory.');
    expect(prompt).toContain('Visual storytelling prompt: Compose the observatory as a wide reveal with Flux framed against the storm window.');
    expect(prompt).toContain('Dialogue context for final lettering: FLUX: We are too late.');
    expect(prompt).toContain('Visual reference needs: characters - Flux, Mira; locations - Sky Observatory; NPCs - Storm Courier');
    expect(prompt).toContain('Page context: The team reaches the observatory before the storm breaks.');
    expect(prompt).toContain('Page key characters: Flux, Mira');
    expect(prompt).toContain('Page key location: Sky Observatory');
    expect(prompt).toContain('Character references: Flux hero ref');
    expect(prompt).toContain('Location / asset references: Sky Observatory exterior');
    expect(prompt).toContain('NPC references: Storm Courier');
    expect(prompt).toContain('Panel layout intent: wide');
    expect(prompt).toContain('Art style: clean superhero comic');
    expect(prompt).toContain('Reference style lock: Match the active reference images');
    expect(prompt).toContain('Do not include speech bubbles, captions, narration boxes, lettering, watermarks, or embedded text unless the user manually adds text to this prompt.');
  });

  it('rebuilds guided Imageshop prompts from the active reference slots', () => {
    const handoff = {
      source: 'guided-comic' as const,
      currentStep: 'art' as const,
      sourceLabel: 'Guided Comic Flow · Page 3, Panel 2',
      characters: [
        {
          name: 'hayward',
          displayName: 'Hayward profile',
          imageUrl: 'https://example.com/hayward.png',
          sourceType: 'character' as const,
        },
      ],
      locations: [
        {
          name: 'spark chamber',
          displayName: 'Spark Chamber',
          imageUrl: 'https://example.com/spark-chamber.png',
          sourceType: 'asset' as const,
        },
      ],
      npcs: [
        {
          name: 'spark flame',
          displayName: 'Contained Flame',
          imageUrl: 'https://example.com/flame.png',
          sourceType: 'npc' as const,
        },
      ],
    };

    const prompt = buildGuidedImageWorkshopPromptForActiveReferences(handoff, [
      'https://example.com/spark-chamber.png',
      'https://example.com/flame.png',
    ]);

    expect(prompt).toContain('Character references: None selected');
    expect(prompt).toContain('Location / asset references: Spark Chamber');
    expect(prompt).toContain('NPC references: Contained Flame');
    expect(prompt).not.toContain('Hayward profile');
  });

  it('maps guided panel layout intent to the closest Imageshop aspect ratio', () => {
    const base = {
      source: 'guided-comic' as const,
      currentStep: 'art' as const,
      sourceLabel: 'Guided Comic Flow · Page 1, Panel 1',
      characters: [],
      locations: [],
      npcs: [],
    };

    expect(getGuidedImageWorkshopAspectRatio({ ...base, panelLayout: { intent: 'wide' } })).toBe('21:9');
    expect(getGuidedImageWorkshopAspectRatio({ ...base, panelLayout: { intent: 'tall' } })).toBe('9:16');
    expect(getGuidedImageWorkshopAspectRatio({ ...base, panelLayout: { intent: 'feature', templateId: 'splash' } })).toBe('9:16');
    expect(getGuidedImageWorkshopAspectRatio({ ...base, panelLayout: { intent: 'normal' } })).toBe('1:1');
    expect(getGuidedImageWorkshopAspectRatio({ ...base, panelLayout: { columnSpan: 2, rowSpan: 1 } })).toBe('21:9');
    expect(getGuidedImageWorkshopAspectRatio({ ...base, panelLayout: { aspectRatioHint: '1:1', intent: 'wide' } })).toBe('1:1');
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
      npcs: [
        {
          name: 'alley witness',
          displayName: 'Alley Witness',
          imageUrl: 'https://example.com/witness.png',
          sourceType: 'npc',
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
    expect(out?.npcs).toHaveLength(1);
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

  it('returns to guided comic flow without creating a panel image return', () => {
    useImageWorkshopBridge.getState().requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'art',
      returnTarget: 'guided-comic-art',
      sourceLabel: 'Guided Comic Flow · Page 1, Panel 2',
      pageNumber: 1,
      panelNumber: 2,
      characters: [],
      locations: [],
      npcs: [],
    });

    useImageWorkshopBridge.getState().returnToGuidedComicFlow();

    expect(useImageWorkshopBridge.getState().portalToOpen).toBe('comic');
    expect(useImageWorkshopBridge.getState().guidedPanelReturn).toBeNull();
    expect(useImageWorkshopBridge.getState().guidedHandoff?.pageNumber).toBe(1);
  });
});
