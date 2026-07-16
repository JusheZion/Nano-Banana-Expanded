import { describe, expect, it } from 'vitest';
import { truncateWriterPromptText } from '../writerPromptText';

describe('truncateWriterPromptText', () => {
  it('keeps the complete result within the API character limit', () => {
    const result = truncateWriterPromptText('x'.repeat(20_000), 16_000);

    expect(result).toHaveLength(16_000);
    expect(result.endsWith('…(truncated)')).toBe(true);
  });

  it('returns trimmed text unchanged when it already fits', () => {
    expect(truncateWriterPromptText('  Lore context  ', 16_000)).toBe('Lore context');
  });

  it('handles caps shorter than the truncation marker', () => {
    expect(truncateWriterPromptText('long lore context', 4)).toHaveLength(4);
  });
});
