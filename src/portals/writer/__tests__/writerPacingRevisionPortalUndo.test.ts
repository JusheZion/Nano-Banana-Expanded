import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(
  process.cwd(),
  'src/portals/writer/WriterPortal.tsx',
), 'utf8');

describe('WriterPortal transactional Pacing Revision Undo', () => {
  it('uses one atomic RPC and performs no client-side live Undo mutations', () => {
    const start = source.indexOf('const undoPacingRevision = useCallback');
    const end = source.indexOf('const runLibraryDeleteSelectedPages', start);
    const branch = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(branch).toContain('undoWriterPacingRevisionSet(cachedSet.id)');
    expect(branch).toContain('resolvePacingRevisionReopenFailure');
    expect(branch).toContain("if (!persisted.ok) throw new Error(persisted.error)");
    expect(branch).not.toContain('undoPacingRevisionApply');
    expect(branch).not.toContain('validatePacingRevisionUndoAuthority');
    expect(branch).not.toContain('updateWriterPageBeatsJsonExact');
    expect(branch).not.toContain('updateWriterPageScriptTextExact');
    expect(branch).not.toContain('deleteWriterPagesExact');
    expect(branch).not.toContain('deleteWriterOutlineById');
  });
});
