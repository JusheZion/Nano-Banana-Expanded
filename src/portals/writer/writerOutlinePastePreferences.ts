export type OutlinePastePreferences = {
  reviewFrequency: 'always' | 'when_needed' | 'never_interrupt';
  aiClassification: 'off' | 'suggest' | 'classify_with_review';
  showFirstUseGuidance: boolean;
};

export const WRITER_OUTLINE_PASTE_PREFERENCES_STORAGE_KEY = 'arcs.writer.outlinePastePreferences.v1';

export const DEFAULT_OUTLINE_PASTE_PREFERENCES: Readonly<OutlinePastePreferences> = Object.freeze({
  reviewFrequency: 'when_needed',
  aiClassification: 'off',
  showFirstUseGuidance: true,
});

function createDefaultOutlinePastePreferences(): OutlinePastePreferences {
  return { ...DEFAULT_OUTLINE_PASTE_PREFERENCES };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isReviewFrequency(value: unknown): value is OutlinePastePreferences['reviewFrequency'] {
  return value === 'always' || value === 'when_needed' || value === 'never_interrupt';
}

function isAiClassification(value: unknown): value is OutlinePastePreferences['aiClassification'] {
  return value === 'off' || value === 'suggest' || value === 'classify_with_review';
}

export function loadOutlinePastePreferences(storage: Pick<Storage, 'getItem'>): OutlinePastePreferences {
  try {
    const raw = storage.getItem(WRITER_OUTLINE_PASTE_PREFERENCES_STORAGE_KEY);
    if (!raw) return createDefaultOutlinePastePreferences();

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return createDefaultOutlinePastePreferences();

    return {
      reviewFrequency: isReviewFrequency(parsed.reviewFrequency)
        ? parsed.reviewFrequency
        : DEFAULT_OUTLINE_PASTE_PREFERENCES.reviewFrequency,
      aiClassification: isAiClassification(parsed.aiClassification)
        ? parsed.aiClassification
        : DEFAULT_OUTLINE_PASTE_PREFERENCES.aiClassification,
      showFirstUseGuidance: typeof parsed.showFirstUseGuidance === 'boolean'
        ? parsed.showFirstUseGuidance
        : DEFAULT_OUTLINE_PASTE_PREFERENCES.showFirstUseGuidance,
    };
  } catch {
    return createDefaultOutlinePastePreferences();
  }
}

export function saveOutlinePastePreferences(
  storage: Pick<Storage, 'setItem'>,
  value: OutlinePastePreferences,
): void {
  try {
    storage.setItem(WRITER_OUTLINE_PASTE_PREFERENCES_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Preference persistence is best-effort; a denied or full store must not interrupt writing.
  }
}
