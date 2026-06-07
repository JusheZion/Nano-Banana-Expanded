import { describe, expect, it } from 'vitest';
import {
  compileImageshopGenerationRequest,
  evaluateImageshopGenerationRequest,
  hashImageshopGenerationPrompt,
} from '@/portals/storyline/imageshopGenerationRequest';
import {
  createDefaultImageshopContinuitySettings,
  createDefaultImageshopPageConfig,
  createDefaultImageshopPromptWorkspace,
} from '@/portals/storyline/imageshopPromptComposer';

describe('compileImageshopGenerationRequest', () => {
  it('uses one exact prompt for preflight, provider execution, provenance, and hashing', () => {
    const request = compileImageshopGenerationRequest({
      mode: 'comic-pages',
      workspace: {
        ...createDefaultImageshopPromptWorkspace(),
        main: 'Flux opens a brass observatory door beneath a rotating star map.',
        negative: 'no blurry faces, no unreadable lettering',
        character: 'Flux wears a cobalt coat with a white comet badge.',
        environment: 'A celestial observatory with blue glass and gold mechanisms.',
        artStyle: 'Ornate celestial comic rendering.',
        camera: 'Low-angle wide panel with the astrolabe in the foreground.',
        continuity: 'Keep Flux gold-eyed and preserve the cobalt coat.',
      },
      artStyle: {
        id: 'celestial',
        name: 'Celestial Ink',
        description: 'Ornate celestial comic rendering.',
        prompt: 'Fine ink contours, luminous blue and gold palette.',
      },
      continuity: {
        ...createDefaultImageshopContinuitySettings(),
        lockFaces: true,
        lockCostumes: true,
      },
      pageConfig: {
        ...createDefaultImageshopPageConfig(),
        includeDialogue: true,
        includeSfx: true,
        layoutTemplateId: 'wide-top',
      },
      references: [
        {
          id: 'flux-reference',
          label: 'Flux identity',
          lane: 'character-dna',
          imageUrl: 'https://example.test/flux.png',
          status: 'ready',
        },
      ],
      modelId: 'pro',
      aspectRatio: '21:9',
      context: 'character',
      source: {
        kind: 'panel',
        queueItemId: 'issue-1-page-1-panel-1',
        pageNumber: 1,
        panelNumber: 1,
      },
    });
    const preflight = evaluateImageshopGenerationRequest(request);

    expect(preflight.canGenerate).toBe(true);
    expect(request.prompt).toContain('Avoid list: no blurry faces');
    expect(request.prompt).toContain('Art style: Celestial Ink');
    expect(request.prompt).toContain('Continuity instructions: Keep Flux gold-eyed');
    expect(request.prompt).toContain('Layout template: wide-top');
    expect(request.prompt).toContain('Panel options: dialogue, SFX');
    expect(request.provider.prompt).toBe(request.prompt);
    expect(request.provenance.prompt).toBe(request.prompt);
    expect(request.promptHash).toBe(hashImageshopGenerationPrompt(request.prompt));
    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.workspace)).toBe(true);
    expect(Object.isFrozen(request.references)).toBe(true);
  });

  it('renders an oversized imported request so preflight can block it without crashing', () => {
    const request = compileImageshopGenerationRequest({
      mode: 'comic-pages',
      workspace: {
        ...createDefaultImageshopPromptWorkspace(),
        main: 'Flux enters the observatory beneath a rotating field of stars.',
      },
      artStyle: null,
      continuity: createDefaultImageshopContinuitySettings(),
      pageConfig: createDefaultImageshopPageConfig(),
      references: Array.from({ length: 15 }, (_, index) => ({
        id: `reference-${index}`,
        label: `Reference ${index}`,
        lane: 'canon' as const,
        imageUrl: `https://example.test/reference-${index}.png`,
      })),
      modelId: 'pro',
      aspectRatio: '21:9',
      context: 'character',
      source: { kind: 'standalone' },
    });

    expect(request.provider.references).toHaveLength(15);
    expect(evaluateImageshopGenerationRequest(request)).toMatchObject({
      canGenerate: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'too-many-references', severity: 'error' }),
      ]),
    });
  });
});
