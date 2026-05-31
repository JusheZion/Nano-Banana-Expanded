import { describe, expect, it } from 'vitest';
import {
  EMPTY_AUTHOR_OUTLINE_SOURCE,
  buildSynopsisDocumentFromParts,
  EMPTY_SYNOPSIS_HELPER_PARTS,
  mergeAuthorOutlineIntoNotes,
  mergeSynopsisHelperIntoNotes,
  readAuthorOutlineFromNotes,
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

  it('readAuthorOutlineFromNotes round-trips source outline metadata', () => {
    const notes = mergeAuthorOutlineIntoNotes(
      { writer_tool_cache: { x: 1 } },
      {
        ...EMPTY_AUTHOR_OUTLINE_SOURCE,
        text: 'Page 1: The door opens.',
        mode: 'preserve',
        updatedAt: '2026-05-31T00:00:00.000Z',
      },
    );
    expect(notes.writer_tool_cache).toEqual({ x: 1 });
    const outline = readAuthorOutlineFromNotes(notes as Record<string, unknown>);
    expect(outline.text).toContain('The door opens');
    expect(outline.mode).toBe('preserve');
    expect(outline.updatedAt).toBe('2026-05-31T00:00:00.000Z');
  });
});
