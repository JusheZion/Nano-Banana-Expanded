import { describe, expect, it } from 'vitest';
import {
  composeImageshopPrompt,
  createDefaultImageshopContinuitySettings,
  createDefaultImageshopPageConfig,
  createDefaultImageshopPromptWorkspace,
} from '@/portals/storyline/imageshopPromptComposer';

describe('composeImageshopPrompt', () => {
  it('composes structured prompt sections, comic page settings, references, and continuity locks', () => {
    const prompt = composeImageshopPrompt({
      mode: 'comic-pages',
      workspace: {
        ...createDefaultImageshopPromptWorkspace(),
        main: 'A hero discovers a storm engine under a glass observatory.',
        negative: 'no blurry faces, no extra fingers',
        character: 'Keep Flux in a red field jacket with brass fasteners.',
        environment: 'Sky observatory with blue glass and gold support beams.',
        camera: 'Low-angle wide panel with readable foreground silhouette.',
        continuity: 'Pendant remains visible in every shot.',
      },
      artStyle: {
        id: 'teslan-cgi',
        name: 'Teslan CGI',
        description: 'Stylized CGI with polished materials and warm rim light.',
        prompt: 'Teslan CGI, crisp stylized rendering, polished surfaces, cinematic warmth.',
      },
      continuity: {
        ...createDefaultImageshopContinuitySettings(),
        lockFaces: true,
        lockCostumes: true,
        lockProps: true,
        characterBibleMode: true,
        strength: 85,
      },
      references: [
        {
          name: 'flux',
          displayName: 'Flux hero reference',
          imageUrl: 'https://example.com/flux.png',
          sourceType: 'character',
          profileName: 'Flux',
          castName: 'Lead hero',
          imageLabel: 'Red jacket turnaround',
          sourceLabel: 'Character Vault',
        },
      ],
      pageConfig: {
        ...createDefaultImageshopPageConfig(),
        pageType: 'double-page-spread',
        includeDialogue: true,
        includeSfx: true,
        layoutTemplateId: 'wide-top',
        panelStyle: {
          ...createDefaultImageshopPageConfig().panelStyle,
          borderStyle: 'manga',
          gutterWidth: 18,
          gutterColor: '#101018',
        },
      },
    });

    expect(prompt).toContain('Generation mode: Comic Pages');
    expect(prompt).toContain('Main prompt: A hero discovers a storm engine');
    expect(prompt).toContain('Negative prompt: no blurry faces');
    expect(prompt).toContain('Art style: Teslan CGI');
    expect(prompt).toContain('Page type: Double Page Spread');
    expect(prompt).toContain('Layout template: wide-top');
    expect(prompt).toContain('Panel options: dialogue, SFX');
    expect(prompt).toContain('Panel style: manga border');
    expect(prompt).toContain('Continuity strength: 85/100');
    expect(prompt).toContain('Character Bible Mode: Use selected references as authoritative source');
    expect(prompt).toContain('Locked continuity: faces, costumes, props');
    expect(prompt).toContain('Flux hero reference');
    expect(prompt).toContain('Red jacket turnaround');
    expect(prompt).toContain('Character Vault');
  });

  it('falls back to a concise video beats prompt when optional sections are empty', () => {
    const prompt = composeImageshopPrompt({
      mode: 'video-beats',
      workspace: {
        ...createDefaultImageshopPromptWorkspace(),
        main: 'Cinematic establishing shot of a night market.',
      },
      artStyle: null,
      continuity: createDefaultImageshopContinuitySettings(),
      references: [],
      pageConfig: createDefaultImageshopPageConfig(),
    });

    expect(prompt).toContain('Generation mode: Video Beats');
    expect(prompt).toContain('Main prompt: Cinematic establishing shot');
    expect(prompt).not.toContain('Negative prompt:');
    expect(prompt).not.toContain('Page type:');
  });

  it('names the default comic page type as Single Comic Page', () => {
    const prompt = composeImageshopPrompt({
      mode: 'comic-pages',
      workspace: {
        ...createDefaultImageshopPromptWorkspace(),
        main: 'A one-page comic beat.',
      },
      artStyle: null,
      continuity: createDefaultImageshopContinuitySettings(),
      references: [],
      pageConfig: createDefaultImageshopPageConfig(),
    });

    expect(prompt).toContain('Page type: Single Comic Page');
  });
});
