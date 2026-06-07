import { referenceUrlToBase64WithMimeRetry } from '@/shared/api/geminiImageApi';
import type { ImageshopGenerationRequestReference } from '@/portals/storyline/imageshopGenerationRequest';
import type { ImageshopReferenceLane } from '@/portals/storyline/imageshopPagePanelQueue';

const MAX_IMAGESHOP_REFERENCES = 14;
const DEFAULT_PREPARATION_CONCURRENCY = 4;
const DEFAULT_PREPARATION_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_BYTES_PER_REFERENCE = 8 * 1024 * 1024;

export const IMAGESHOP_REFERENCE_LANE_ORDER: readonly ImageshopReferenceLane[] = Object.freeze([
  'character-dna',
  'wardrobe',
  'environment',
  'props',
  'style',
  'lighting',
  'canon',
]);

export const IMAGESHOP_PROVIDER_INSTRUCTIONS: Readonly<Record<ImageshopReferenceLane, string>> =
  Object.freeze({
    'character-dna':
      '[Character DNA: preserve identity, face, body, hair, skin, and distinguishing features.]',
    wardrobe:
      '[Wardrobe: reproduce the visible clothing, colors, patterns, and accessories on the intended character.]',
    environment:
      '[Environment: preserve location, architecture, geography, layout, and spatial relationships.]',
    props:
      '[Props: preserve the referenced objects, materials, scale, placement, and recognizable details.]',
    style:
      '[Style: apply rendering language, line quality, texture, palette treatment, and medium only.]',
    lighting:
      '[Lighting: apply time of day, light direction, contrast, weather, atmosphere, and mood only.]',
    canon:
      '[Canon: treat the reference as authoritative continuity evidence where it does not conflict with the written prompt.]',
  });

export type ImageshopCompiledProviderReference = Readonly<
  ImageshopGenerationRequestReference & {
    providerInstruction: string;
  }
>;

export type ImageshopReferencePreparationFailureKind =
  | 'timeout'
  | 'fetch'
  | 'decode'
  | 'size';

export type ImageshopPreparedProviderReference =
  | Readonly<
      ImageshopCompiledProviderReference & {
        status: 'ready';
        base64: string;
        mimeType: string;
        byteLength: number;
      }
    >
  | Readonly<
      ImageshopCompiledProviderReference & {
        status: 'failed';
        failure: Readonly<{
          kind: ImageshopReferencePreparationFailureKind;
          message: string;
        }>;
      }
    >;

export type ImageshopReferencePreparationResult = Readonly<{
  references: readonly ImageshopPreparedProviderReference[];
  byId: Readonly<Record<string, ImageshopPreparedProviderReference>>;
  failedReferenceIds: readonly string[];
}>;

export type ImageshopReferencePreparationOptions = {
  concurrency?: number;
  timeoutMs?: number;
  maxBytesPerReference?: number;
  load?: (
    reference: ImageshopCompiledProviderReference,
  ) => Promise<{ base64: string; mimeType: string }>;
};

function estimateBase64Bytes(base64: string): number {
  const normalized = base64.replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function classifyPreparationFailure(message: string): ImageshopReferencePreparationFailureKind {
  const normalized = message.toLowerCase();
  if (normalized.includes('timed out') || normalized.includes('timeout') || normalized.includes('aborted')) {
    return 'timeout';
  }
  if (
    normalized.includes('base64') ||
    normalized.includes('decode') ||
    normalized.includes('invalid data')
  ) {
    return 'decode';
  }
  if (normalized.includes('size') || normalized.includes('too large') || normalized.includes('exceeds')) {
    return 'size';
  }
  return 'fetch';
}

async function withPreparationTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Reference preparation timed out')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function compileImageshopProviderReferences(
  references: readonly ImageshopGenerationRequestReference[],
  options: { enforceMaximum?: boolean } = {},
): readonly ImageshopCompiledProviderReference[] {
  if (options.enforceMaximum !== false && references.length > MAX_IMAGESHOP_REFERENCES) {
    throw new RangeError(`Imageshop supports at most ${MAX_IMAGESHOP_REFERENCES} references.`);
  }

  const laneRank = new Map(
    IMAGESHOP_REFERENCE_LANE_ORDER.map((lane, index) => [lane, index] as const),
  );
  return Object.freeze(
    references
      .map((reference, originalIndex) => ({ reference, originalIndex }))
      .sort(
        (left, right) =>
          (laneRank.get(left.reference.lane) ?? Number.MAX_SAFE_INTEGER) -
            (laneRank.get(right.reference.lane) ?? Number.MAX_SAFE_INTEGER) ||
          left.originalIndex - right.originalIndex,
      )
      .map(({ reference }) =>
        Object.freeze({
          ...reference,
          providerInstruction: IMAGESHOP_PROVIDER_INSTRUCTIONS[reference.lane],
        }),
      ),
  );
}

export async function prepareImageshopProviderReferences(
  references: readonly ImageshopCompiledProviderReference[],
  options: ImageshopReferencePreparationOptions = {},
): Promise<ImageshopReferencePreparationResult> {
  const concurrency = Math.max(
    1,
    Math.min(references.length || 1, Math.floor(options.concurrency ?? DEFAULT_PREPARATION_CONCURRENCY)),
  );
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_PREPARATION_TIMEOUT_MS);
  const maxBytesPerReference =
    options.maxBytesPerReference ?? DEFAULT_MAX_BYTES_PER_REFERENCE;
  const load =
    options.load ??
    ((reference: ImageshopCompiledProviderReference) =>
      referenceUrlToBase64WithMimeRetry(reference.imageUrl));
  const prepared = new Array<ImageshopPreparedProviderReference>(references.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < references.length) {
      const index = nextIndex;
      nextIndex += 1;
      const reference = references[index];
      try {
        if (!reference.imageUrl.trim()) {
          throw new Error('Failed to fetch reference image: missing image URL');
        }
        const encoded = await withPreparationTimeout(load(reference), timeoutMs);
        const byteLength = estimateBase64Bytes(encoded.base64);
        if (byteLength > maxBytesPerReference) {
          throw new Error(
            `Reference image size exceeds ${maxBytesPerReference} bytes after decoding`,
          );
        }
        prepared[index] = Object.freeze({
          ...reference,
          status: 'ready',
          base64: encoded.base64,
          mimeType: encoded.mimeType,
          byteLength,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        prepared[index] = Object.freeze({
          ...reference,
          status: 'failed',
          failure: Object.freeze({
            kind: classifyPreparationFailure(message),
            message,
          }),
        });
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const byId: Record<string, ImageshopPreparedProviderReference> = {};
  for (const reference of prepared) byId[reference.id] = reference;
  return Object.freeze({
    references: Object.freeze(prepared),
    byId: Object.freeze(byId),
    failedReferenceIds: Object.freeze(
      prepared.filter((reference) => reference.status === 'failed').map((reference) => reference.id),
    ),
  });
}

export async function executeWithPreparedImageshopReferences<T>({
  references,
  prepareOptions,
  execute,
}: {
  references: readonly ImageshopCompiledProviderReference[];
  prepareOptions?: ImageshopReferencePreparationOptions;
  execute: (
    references: readonly Extract<ImageshopPreparedProviderReference, { status: 'ready' }>[],
  ) => Promise<T> | T;
}): Promise<
  | Readonly<{
      ok: true;
      value: T;
      preparation: ImageshopReferencePreparationResult;
    }>
  | Readonly<{
      ok: false;
      failedReferenceIds: readonly string[];
      preparation: ImageshopReferencePreparationResult;
    }>
> {
  const preparation = await prepareImageshopProviderReferences(references, prepareOptions);
  if (preparation.failedReferenceIds.length > 0) {
    return Object.freeze({
      ok: false,
      failedReferenceIds: preparation.failedReferenceIds,
      preparation,
    });
  }

  const readyReferences = preparation.references.filter(
    (
      reference,
    ): reference is Extract<ImageshopPreparedProviderReference, { status: 'ready' }> =>
      reference.status === 'ready',
  );
  return Object.freeze({
    ok: true,
    value: await execute(readyReferences),
    preparation,
  });
}
