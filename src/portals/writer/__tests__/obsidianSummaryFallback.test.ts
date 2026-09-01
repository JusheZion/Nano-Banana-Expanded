import { describe, expect, it } from 'vitest';
import { summaryFromBody } from '../obsidianLoreImport';

/**
 * The Twovestellium vault keeps its summary as a `## Summary` body section
 * rather than a frontmatter key, which is also what its Wiki Page Template
 * generates. Frontmatter still wins where present; this is the fallback.
 */
describe('summaryFromBody', () => {
  it('reads the prose under a Summary heading', () => {
    expect(summaryFromBody('# T\n\n## Summary\n\nFirst line.\nSecond line.\n\n## Core Details\n\nno'))
      .toBe('First line. Second line.');
  });

  it('stops at the next heading of any level', () => {
    expect(summaryFromBody('## Summary\n\nKept.\n\n### Deeper\n\nDropped.')).toBe('Kept.');
  });

  it('runs to the end when Summary is the last section', () => {
    expect(summaryFromBody('## Summary\n\nOnly section.')).toBe('Only section.');
  });

  it('does not truncate on a literal Z', () => {
    // `\Z` is not a JavaScript anchor; using it matched the letter instead.
    expect(summaryFromBody('## Summary\n\nZaniah and Zero met.\n\n## Next')).toBe('Zaniah and Zero met.');
  });

  it('is case- and level-insensitive about the heading', () => {
    expect(summaryFromBody('# summary\n\nx.')).toBe('x.');
    expect(summaryFromBody('#### SUMMARY\n\nx.')).toBe('x.');
  });

  it('returns empty when there is no Summary section', () => {
    expect(summaryFromBody('# T\n\n## Core Details\n\nx')).toBe('');
    expect(summaryFromBody('')).toBe('');
  });

  it('ignores a heading that merely starts with the word', () => {
    expect(summaryFromBody('## Summary Of Sources\n\nx.')).toBe('');
  });

  it('collapses blank lines rather than emitting ragged whitespace', () => {
    expect(summaryFromBody('## Summary\n\n\nOne.\n\n\nTwo.\n\n## End')).toBe('One. Two.');
  });
});
