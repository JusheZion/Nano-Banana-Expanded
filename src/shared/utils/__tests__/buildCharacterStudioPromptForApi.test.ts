import { describe, it, expect } from 'vitest';
import { buildCharacterStudioPromptForApi } from '../buildCharacterStudioPromptForApi';
import { ART_STYLE_PERMANENT_TAG } from '../../../data/character_studio_spec';
import type { ChipTag } from '../PromptCompiler';

const defaultWardrobeModifiers = {
  tops: { color: '#888888', material: 'matte' as const },
  bottoms: { color: '#888888', material: 'matte' as const },
  outerwear: { color: '#888888', material: 'matte' as const },
  accessories: { color: '#888888', material: 'matte' as const },
  hats: { color: '#888888', material: 'matte' as const },
  glasses: { color: '#888888', material: 'matte' as const },
};

const defaultWardrobeSelections = {
  tops: [],
  bottoms: [],
  outerwear: [],
  accessories: [],
  hats: [],
  glasses: [],
} satisfies Record<string, string[]>;

function makeBaseArgs(overrides?: Partial<Parameters<typeof buildCharacterStudioPromptForApi>[0]>) {
  const base = {
    tags: [] as ChipTag[],
    vaultPromptOverride: '',
    artStyleId: 'flagship',
    diversifyLikeness: true,
    currentLiveImageUrl: 'http://live',
    heritageSelection: [],
    genderSelection: [],
    physicalSelections: {} as Record<string, string[]>,
    wardrobeSelections: defaultWardrobeSelections,
    wardrobeModifiers: defaultWardrobeModifiers,
    cinematic: {} as Record<string, string>,
    facialExpressionSelection: [] as string[],
    referenceImageUrls: Array.from({ length: 14 }, () => ''),
  };
  return { ...base, ...overrides } as Parameters<typeof buildCharacterStudioPromptForApi>[0];
}

describe('buildCharacterStudioPromptForApi', () => {
  it('uses non-empty vaultPromptOverride as the compiled base (before expressions and permanent tag)', () => {
    const unique = 'CUSTOM_VAULT_OVERRIDE_XYZ';
    const { promptForApi } = buildCharacterStudioPromptForApi(
      makeBaseArgs({
        tags: [
          { id: 't1', text: 'should-not-appear-from-tags', polarity: 'positive' },
        ] as ChipTag[],
        vaultPromptOverride: unique,
        referenceImageUrls: Array.from({ length: 14 }, () => ''),
      })
    );
    expect(promptForApi).toContain(unique);
    expect(promptForApi).not.toContain('should-not-appear-from-tags');
  });

  it('always includes the permanent art-style tag', () => {
    const args = makeBaseArgs({
      referenceImageUrls: Array.from({ length: 14 }, () => ''),
    });
    const { promptForApi } = buildCharacterStudioPromptForApi(args);
    expect(promptForApi).toContain(ART_STYLE_PERMANENT_TAG);
  });

  it('includes facial expressions when selected', () => {
    const args = makeBaseArgs({
      facialExpressionSelection: ['happy', 'sad'],
      referenceImageUrls: Array.from({ length: 14 }, () => ''),
    });
    const { promptForApi } = buildCharacterStudioPromptForApi(args);
    expect(promptForApi).toContain('happy');
    expect(promptForApi).toContain('sad');
  });

  it('uses the wardrobe-dna base prompt template when wardrobe slots are populated', () => {
    const refs = Array.from({ length: 14 }, () => '');
    refs[0] = 'identity';
    refs[4] = 'wardrobe';

    const { promptForApi } = buildCharacterStudioPromptForApi(
      makeBaseArgs({
        referenceImageUrls: refs,
      })
    );

    expect(promptForApi).toContain(
      'their clothing, shoes, hat, bag, and accessories must match Wardrobe DNA reference images literally'
    );
    expect(promptForApi).not.toContain('Do not keep the subject photorealistic');
  });

  it('uses the non-wardrobe base prompt template when wardrobe slots are not populated', () => {
    const refs = Array.from({ length: 14 }, () => '');
    refs[0] = 'identity';

    const { promptForApi } = buildCharacterStudioPromptForApi(
      makeBaseArgs({
        referenceImageUrls: refs,
      })
    );

    expect(promptForApi).toContain('Apply this art style to the entire image, including the subject');
    expect(promptForApi).toContain('Art style: Smooth Animated 3D/CGI Render.');
  });

  it('appends session framing for aspect ratio and optional age / pose', () => {
    const { promptForApi } = buildCharacterStudioPromptForApi(
      makeBaseArgs({
        referenceImageUrls: Array.from({ length: 14 }, () => ''),
        ageModifier: 2,
        selectedPoseName: 'Hero stance',
        outputAspectRatio: '21:9',
      })
    );
    expect(promptForApi).toContain('Session framing:');
    expect(promptForApi).toContain('Age direction:');
    expect(promptForApi).toContain('+2');
    expect(promptForApi).toContain('cinematic 21:9');
    expect(promptForApi).toContain('Hero stance');
  });

  it('includes neutral age line when ageModifier is 0', () => {
    const { promptForApi } = buildCharacterStudioPromptForApi(
      makeBaseArgs({
        referenceImageUrls: Array.from({ length: 14 }, () => ''),
        ageModifier: 0,
      })
    );
    expect(promptForApi).toContain('Age modifier: gallery slider at 0');
  });

  it('merges currentLiveImageUrl into first empty ref slot when not already present', () => {
    const refs = Array.from({ length: 14 }, () => '');
    refs[0] = 'http://identity';
    const { refUrlsForApi } = buildCharacterStudioPromptForApi(
      makeBaseArgs({
        referenceImageUrls: refs,
        currentLiveImageUrl: 'http://live-pose',
      })
    );
    expect(refUrlsForApi[0]).toBe('http://identity');
    expect(refUrlsForApi[1]).toBe('http://live-pose');
  });

  it('uses slot 0 for live image when all slots are full and live is not in the grid', () => {
    const refs = Array.from({ length: 14 }, (_, i) => `http://ref-${i}`);
    const { refUrlsForApi } = buildCharacterStudioPromptForApi(
      makeBaseArgs({
        referenceImageUrls: refs,
        currentLiveImageUrl: 'http://live-only',
      })
    );
    expect(refUrlsForApi[0]).toBe('http://live-only');
  });

  it('adds unnamed gallery pose hint when selectedGalleryPoseActive', () => {
    const { promptForApi } = buildCharacterStudioPromptForApi(
      makeBaseArgs({
        referenceImageUrls: Array.from({ length: 14 }, () => ''),
        selectedPoseName: null,
        selectedGalleryPoseActive: true,
      })
    );
    expect(promptForApi).toContain('Active gallery pose (unnamed)');
  });

  it('appends surgical instructions based on populated slot groups', () => {
    const refs = Array.from({ length: 14 }, () => '');
    refs[0] = 'identity';
    refs[4] = 'wardrobe';
    refs[10] = 'composition';

    const { promptForApi } = buildCharacterStudioPromptForApi(
      makeBaseArgs({
        referenceImageUrls: refs,
      })
    );

    expect(promptForApi).toContain(
      'Preserve face, body, skin tone, hair, and tattoos from Character DNA (identity) references'
    );
    expect(promptForApi).toContain(
      'Wardrobe DNA references: copy the full real-world outfit (shirt, pants, shoes, hat, bag, jewelry) onto that person.'
    );
    expect(promptForApi).toContain('Match the lighting and atmospheric mood from the composition references.');
  });
});

