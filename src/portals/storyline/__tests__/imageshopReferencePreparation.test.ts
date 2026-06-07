import { describe, expect, it, vi } from 'vitest';
import {
  compileImageshopProviderReferences,
  executeWithPreparedImageshopReferences,
  prepareImageshopProviderReferences,
} from '@/portals/storyline/imageshopReferencePreparation';
import type { ImageshopGenerationRequestReference } from '@/portals/storyline/imageshopGenerationRequest';

const mixedReferences: ImageshopGenerationRequestReference[] = [
  {
    id: 'canon-1',
    label: 'Flux canon portrait',
    lane: 'canon',
    imageUrl: 'https://example.test/canon.png',
  },
  {
    id: 'wardrobe-1',
    label: 'Cobalt coat',
    lane: 'wardrobe',
    imageUrl: 'https://example.test/wardrobe.png',
  },
  {
    id: 'lighting-1',
    label: 'Blue hour',
    lane: 'lighting',
    imageUrl: 'https://example.test/lighting.png',
  },
  {
    id: 'character-1',
    label: 'Flux turnaround',
    lane: 'character-dna',
    imageUrl: 'https://example.test/character.png',
  },
  {
    id: 'props-1',
    label: 'Brass compass',
    lane: 'props',
    imageUrl: 'https://example.test/props.png',
  },
  {
    id: 'style-1',
    label: 'Celestial ink',
    lane: 'style',
    imageUrl: 'https://example.test/style.png',
  },
  {
    id: 'environment-1',
    label: 'Observatory',
    lane: 'environment',
    imageUrl: 'https://example.test/environment.png',
  },
];

describe('Imageshop reference preparation', () => {
  it('maps every reference lane to an explicit provider role in deterministic order', () => {
    const compiled = compileImageshopProviderReferences(mixedReferences);

    expect(compiled.map((reference) => reference.id)).toEqual([
      'character-1',
      'wardrobe-1',
      'environment-1',
      'props-1',
      'style-1',
      'lighting-1',
      'canon-1',
    ]);
    expect(compiled.map((reference) => reference.providerInstruction)).toEqual([
      '[Character DNA: preserve identity, face, body, hair, skin, and distinguishing features.]',
      '[Wardrobe: reproduce the visible clothing, colors, patterns, and accessories on the intended character.]',
      '[Environment: preserve location, architecture, geography, layout, and spatial relationships.]',
      '[Props: preserve the referenced objects, materials, scale, placement, and recognizable details.]',
      '[Style: apply rendering language, line quality, texture, palette treatment, and medium only.]',
      '[Lighting: apply time of day, light direction, contrast, weather, atmosphere, and mood only.]',
      '[Canon: treat the reference as authoritative continuity evidence where it does not conflict with the written prompt.]',
    ]);
  });

  it('keeps the existing maximum-reference guard at fourteen', () => {
    expect(() =>
      compileImageshopProviderReferences(
        Array.from({ length: 15 }, (_, index) => ({
          id: `reference-${index}`,
          label: `Reference ${index}`,
          lane: 'canon' as const,
          imageUrl: `https://example.test/reference-${index}.png`,
        })),
      ),
    ).toThrow('14');
  });

  it('prepares references concurrently with bounded concurrency and preserves deterministic output order', async () => {
    let active = 0;
    let maxActive = 0;
    const release: Array<() => void> = [];
    const load = vi.fn(
      (reference: { id: string }) =>
        new Promise<{ base64: string; mimeType: string }>((resolve) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          release.push(() => {
            active -= 1;
            resolve({ base64: btoa(reference.id), mimeType: 'image/png' });
          });
        }),
    );
    const compiled = compileImageshopProviderReferences(mixedReferences.slice(0, 5));
    const pending = prepareImageshopProviderReferences(compiled, {
      concurrency: 2,
      load,
    });

    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    release.shift()?.();
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    release.shift()?.();
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(4));
    release.shift()?.();
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(5));
    while (release.length > 0) release.shift()?.();

    const result = await pending;

    expect(maxActive).toBe(2);
    expect(result.references.map((reference) => reference.id)).toEqual(
      compiled.map((reference) => reference.id),
    );
    expect(Object.keys(result.byId)).toEqual(compiled.map((reference) => reference.id));
  });

  it.each([
    ['timeout', new Error('Reference preparation timed out')],
    ['fetch', new Error('Failed to fetch reference image (403)')],
    ['decode', new Error('Failed to read image as base64')],
  ] as const)('attributes %s failures to the reference id', async (failureKind, error) => {
    const [reference] = compileImageshopProviderReferences(mixedReferences);
    const result = await prepareImageshopProviderReferences([reference], {
      load: async () => {
        throw error;
      },
    });

    expect(result.failedReferenceIds).toEqual([reference.id]);
    expect(result.byId[reference.id]).toMatchObject({
      id: reference.id,
      status: 'failed',
      failure: {
        kind: failureKind,
        message: error.message,
      },
    });
  });

  it('reports oversized decoded references by id', async () => {
    const [reference] = compileImageshopProviderReferences(mixedReferences);
    const result = await prepareImageshopProviderReferences([reference], {
      maxBytesPerReference: 2,
      load: async () => ({ base64: btoa('too large'), mimeType: 'image/png' }),
    });

    expect(result.byId[reference.id]).toMatchObject({
      id: reference.id,
      status: 'failed',
      failure: { kind: 'size' },
    });
  });

  it('suppresses the provider call until every included reference is ready', async () => {
    const provider = vi.fn();
    const compiled = compileImageshopProviderReferences(mixedReferences.slice(0, 2));
    const result = await executeWithPreparedImageshopReferences({
      references: compiled,
      prepareOptions: {
        load: async (reference) => {
          if (reference.id === 'wardrobe-1') throw new Error('Failed to fetch reference image (404)');
          return { base64: btoa(reference.id), mimeType: 'image/png' };
        },
      },
      execute: provider,
    });

    expect(result).toMatchObject({
      ok: false,
      failedReferenceIds: ['wardrobe-1'],
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it('does not call the provider while an included reference is still unknown', async () => {
    let release: ((value: { base64: string; mimeType: string }) => void) | undefined;
    const provider = vi.fn(async () => 'generated');
    const [reference] = compileImageshopProviderReferences(mixedReferences);
    const pending = executeWithPreparedImageshopReferences({
      references: [reference],
      prepareOptions: {
        load: () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      },
      execute: provider,
    });

    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    expect(provider).not.toHaveBeenCalled();

    release?.({ base64: btoa(reference.id), mimeType: 'image/png' });
    const result = await pending;

    expect(result).toMatchObject({ ok: true, value: 'generated' });
    expect(provider).toHaveBeenCalledTimes(1);
  });
});
