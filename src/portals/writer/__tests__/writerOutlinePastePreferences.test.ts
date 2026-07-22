import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OUTLINE_PASTE_PREFERENCES,
  loadOutlinePastePreferences,
  saveOutlinePastePreferences,
  WRITER_OUTLINE_PASTE_PREFERENCES_STORAGE_KEY,
  type OutlinePastePreferences,
} from '../writerOutlinePastePreferences';

function createStorage(initialValue: string | null = null): Pick<Storage, 'getItem' | 'setItem'> {
  let value = initialValue;

  return {
    getItem: (key) => (key === WRITER_OUTLINE_PASTE_PREFERENCES_STORAGE_KEY ? value : null),
    setItem: (key, nextValue) => {
      if (key === WRITER_OUTLINE_PASTE_PREFERENCES_STORAGE_KEY) value = nextValue;
    },
  };
}

describe('writer outline paste preferences', () => {
  it('uses conservative defaults when storage is missing', () => {
    const storage = createStorage();

    expect(loadOutlinePastePreferences(storage)).toEqual(DEFAULT_OUTLINE_PASTE_PREFERENCES);
    expect(DEFAULT_OUTLINE_PASTE_PREFERENCES).toEqual({
      reviewFrequency: 'when_needed',
      aiClassification: 'off',
      showFirstUseGuidance: true,
    });
  });

  it.each<OutlinePastePreferences['reviewFrequency']>(['always', 'when_needed', 'never_interrupt'])(
    'loads the %s review frequency',
    (reviewFrequency) => {
      const storage = createStorage(JSON.stringify({ reviewFrequency }));

      expect(loadOutlinePastePreferences(storage)).toEqual({
        ...DEFAULT_OUTLINE_PASTE_PREFERENCES,
        reviewFrequency,
      });
    },
  );

  it.each<OutlinePastePreferences['aiClassification']>(['off', 'suggest', 'classify_with_review'])(
    'loads the %s AI classification setting',
    (aiClassification) => {
      const storage = createStorage(JSON.stringify({ aiClassification }));

      expect(loadOutlinePastePreferences(storage)).toEqual({
        ...DEFAULT_OUTLINE_PASTE_PREFERENCES,
        aiClassification,
      });
    },
  );

  it.each([true, false])('loads the %s first-use guidance setting', (showFirstUseGuidance) => {
    const storage = createStorage(JSON.stringify({ showFirstUseGuidance }));

    expect(loadOutlinePastePreferences(storage)).toEqual({
      ...DEFAULT_OUTLINE_PASTE_PREFERENCES,
      showFirstUseGuidance,
    });
  });

  it('round-trips a complete valid preference value with the stable Writer key', () => {
    const storage = createStorage();
    const value: OutlinePastePreferences = {
      reviewFrequency: 'never_interrupt',
      aiClassification: 'classify_with_review',
      showFirstUseGuidance: false,
    };

    saveOutlinePastePreferences(storage, value);

    expect(WRITER_OUTLINE_PASTE_PREFERENCES_STORAGE_KEY).toBe('arcs.writer.outlinePastePreferences.v1');
    expect(loadOutlinePastePreferences(storage)).toEqual(value);
  });

  it('merges partial data with defaults and ignores unknown properties', () => {
    const storage = createStorage(JSON.stringify({ reviewFrequency: 'always', futureOption: 'ignored' }));

    expect(loadOutlinePastePreferences(storage)).toEqual({
      reviewFrequency: 'always',
      aiClassification: 'off',
      showFirstUseGuidance: true,
    });
  });

  it('falls back field-by-field for invalid enum strings and boolean types', () => {
    const storage = createStorage(JSON.stringify({
      reviewFrequency: 'sometimes',
      aiClassification: 'automatic',
      showFirstUseGuidance: 'false',
    }));

    expect(loadOutlinePastePreferences(storage)).toEqual(DEFAULT_OUTLINE_PASTE_PREFERENCES);
  });

  it.each([
    ['invalid JSON', '{not-json'],
    ['an array', JSON.stringify(['always', 'suggest'])],
    ['null', JSON.stringify(null)],
  ])('falls back safely for %s', (_label, raw) => {
    expect(loadOutlinePastePreferences(createStorage(raw))).toEqual(DEFAULT_OUTLINE_PASTE_PREFERENCES);
  });

  it('never throws when reading or writing storage fails', () => {
    const readFailure = { getItem: () => { throw new Error('storage denied'); } };
    const writeFailure = { setItem: () => { throw new Error('quota exceeded'); } };

    expect(loadOutlinePastePreferences(readFailure)).toEqual(DEFAULT_OUTLINE_PASTE_PREFERENCES);
    expect(() => saveOutlinePastePreferences(writeFailure, DEFAULT_OUTLINE_PASTE_PREFERENCES)).not.toThrow();
  });
});
