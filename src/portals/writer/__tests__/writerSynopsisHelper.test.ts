import { describe, expect, it } from 'vitest';
import {
  buildSynopsisDocumentFromParts,
  EMPTY_SYNOPSIS_HELPER_PARTS,
  mergeSynopsisHelperIntoNotes,
  readSynopsisHelperFromNotes,
} from '../writerSynopsisHelper';

describe('writerSynopsisHelper', () => {
  it('buildSynopsisDocumentFromParts joins labeled blocks', () => {
    const doc = buildSynopsisDocumentFromParts({
      ...EMPTY_SYNOPSIS_HELPER_PARTS,
      logline: 'A hero falls.',
      mustHappen: '1. Opens door\n2. Finds letter',
      rules: 'No repeating beats.',
    });
    expect(doc).toContain('LOGLINE');
    expect(doc).toContain('A hero falls.');
    expect(doc).toContain('MUST-HAPPEN BEATS');
    expect(doc).toContain('RULES FOR THE OUTLINE');
  });

  it('readSynopsisHelperFromNotes round-trips merge', () => {
    const notes = mergeSynopsisHelperIntoNotes(
      { writer_tool_cache: { x: 1 } },
      {
        ...EMPTY_SYNOPSIS_HELPER_PARTS,
        logline: 'Test',
        mustHappen: 'Beat one',
      },
    );
    expect(notes.writer_tool_cache).toEqual({ x: 1 });
    const parts = readSynopsisHelperFromNotes(notes as Record<string, unknown>);
    expect(parts.logline).toBe('Test');
    expect(parts.mustHappen).toBe('Beat one');
  });
});
