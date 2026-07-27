import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('WriterPortal batch Pacing Review replacement wiring', () => {
  it('uses the preflight batch orchestrator and guarded archive API', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/portals/writer/WriterPortal.tsx'),
      'utf8',
    );

    expect(source).toContain('runPacingReviewBatch');
    expect(source).toContain('listWriterPacingRevisionSets');
    expect(source).toContain('archiveWriterPacingRevisionSet');
    expect(source).toMatch(/await runPacingReviewBatch\(\{/);
    expect(source).toMatch(/expectedStatus:\s*revisionSet\.status/);
    expect(source).toMatch(/expectedUpdatedAt:\s*revisionSet\.updated_at/);
    expect(source).toMatch(/for \(const outcome of result\.outcomes\)/);
    expect(source.match(/<WriterPacingBatchStatus/g)).toHaveLength(2);
  });
});
