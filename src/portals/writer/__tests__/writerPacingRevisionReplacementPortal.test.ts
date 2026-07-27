import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(
  process.cwd(),
  'src/portals/writer/WriterPortal.tsx',
), 'utf8');

describe('WriterPortal single Pacing Review replacement orchestration', () => {
  it('checks replacement policy before AI and archives only after AI success', () => {
    const start = source.indexOf('const runPacingFromRibbon = useCallback');
    const end = source.indexOf('const runCanonFromRibbon', start);
    const branch = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(branch).toContain('getPacingRevisionReplacementPolicy');
    expect(branch).toContain('window.confirm');
    expect(branch).toContain('&& !window.confirm(replacementPolicy.message)');
    expect(branch).toContain(') return;');
    expect(branch).toContain('archiveActivePacingRevision');
    expect(branch.indexOf('getPacingRevisionReplacementPolicy'))
      .toBeLessThan(branch.indexOf("mode: 'pacing_review'"));
    expect(branch.indexOf('if (res.success)'))
      .toBeLessThan(branch.indexOf('archiveActivePacingRevision'));
    expect(branch.indexOf('archiveActivePacingRevision'))
      .toBeLessThan(branch.indexOf('} else {'));
    expect(branch).toContain(
      'The new Pacing Review was saved, but the previous Revision Set changed before it could be archived.',
    );
  });

  it('routes every single-review button through the shared orchestration', () => {
    expect(source.match(/void runPacingFromRibbon\(\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/mode: 'pacing_review'/g)?.length).toBe(3);
  });
});
