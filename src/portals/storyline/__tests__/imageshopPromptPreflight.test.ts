import { describe, expect, it } from 'vitest';
import {
  evaluateImageshopPromptPreflight,
  type ImageshopPreflightReference,
} from '@/portals/storyline/imageshopPromptPreflight';
import {
  composeImageshopPrompt,
  createDefaultImageshopContinuitySettings,
  createDefaultImageshopPageConfig,
  createDefaultImageshopPromptWorkspace,
} from '@/portals/storyline/imageshopPromptComposer';

function evaluate({
  main,
  references = [],
  canonConflictCount = 0,
  missingReferenceCount = 0,
}: {
  main: string;
  references?: ImageshopPreflightReference[];
  canonConflictCount?: number;
  missingReferenceCount?: number;
}) {
  const workspace = {
    ...createDefaultImageshopPromptWorkspace(),
    main,
  };
  return evaluateImageshopPromptPreflight({
    composedPrompt: composeImageshopPrompt({
      mode: 'comic-pages',
      workspace,
      artStyle: null,
      continuity: createDefaultImageshopContinuitySettings(),
      references: [],
      pageConfig: createDefaultImageshopPageConfig(),
    }),
    workspace,
    references,
    canonConflictCount,
    missingReferenceCount,
  });
}

describe('evaluateImageshopPromptPreflight', () => {
  it('blocks prompts with too little visual direction', () => {
    const preflight = evaluate({ main: 'Blue hero.' });

    expect(preflight.canGenerate).toBe(false);
    expect(preflight.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'weak-prompt',
        severity: 'error',
      }),
    );
  });

  it('blocks prompts whose payload is mostly page configuration', () => {
    const preflight = evaluate({ main: 'Flux stands under stars.' });

    expect(preflight.canGenerate).toBe(false);
    expect(preflight.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'configuration-dominant',
        severity: 'error',
      }),
    );
  });

  it('blocks oversized reference payloads and reports timeout risk', () => {
    const largeReference = `data:image/png;base64,${'A'.repeat(11_200_000)}`;
    const preflight = evaluate({
      main: 'Flux opens a brass observatory door in a low-angle wide comic panel.',
      references: [
        {
          label: 'Oversized Flux turnaround',
          imageUrl: largeReference,
          signedUrlStatus: 'ready',
        },
      ],
    });

    expect(preflight.canGenerate).toBe(false);
    expect(preflight.payload.knownBytes).toBeGreaterThan(8 * 1024 * 1024);
    expect(preflight.payload.likelyTimeout).toBe(true);
    expect(preflight.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'reference-payload-too-large',
        severity: 'error',
      }),
    );
  });

  it('blocks failed or unresolved references and canon conflicts', () => {
    const preflight = evaluate({
      main: 'Flux opens a brass observatory door in a low-angle wide comic panel.',
      references: [
        {
          label: 'Flux signed reference',
          imageUrl: 'https://example.test/expired.png',
          signedUrlStatus: 'failed',
        },
      ],
      canonConflictCount: 1,
      missingReferenceCount: 1,
    });

    expect(preflight.canGenerate).toBe(false);
    expect(preflight.payload.failedReferences).toBe(1);
    expect(preflight.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        'reference-fetch-failed',
        'missing-reference',
        'canon-conflict',
      ]),
    );
  });

  it('returns ready payload health for a specific prompt and healthy references', () => {
    const preflight = evaluate({
      main: 'Flux opens a brass observatory door in a low-angle wide comic panel.',
      references: [
        {
          label: 'Flux turnaround',
          imageUrl: 'https://example.test/flux.png',
          signedUrlStatus: 'ready',
        },
      ],
    });

    expect(preflight.canGenerate).toBe(true);
    expect(preflight.status).toBe('ready');
    expect(preflight.payload).toMatchObject({
      referenceCount: 1,
      readyReferences: 1,
      failedReferences: 0,
      likelyTimeout: false,
    });
  });
});
