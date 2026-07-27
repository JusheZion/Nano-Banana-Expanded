import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'supabase/functions/writer-tools/index.ts'),
  'utf8',
);
const branchStart = source.indexOf("parsedReq.data.mode === 'pacing_revision_page_preview'");
const branchEnd = source.indexOf("parsedReq.data.mode === 'outline_treatment_preview'", branchStart);
const branch = source.slice(branchStart, branchEnd);

describe('writer-tools archived Pacing Revision immutability', () => {
  it('rejects archived sets before page generation or persistence', () => {
    expect(branchStart).toBeGreaterThan(-1);
    expect(branch).toMatch(/\['applied', 'discarded', 'applying', 'archived'\]\.includes\(revisionSet\.status\)/);
    expect(branch.indexOf("'archived'")).toBeLessThan(
      branch.indexOf('executePacingRevisionPagePreviewFlow'),
    );
  });

  it('checks every parent/item mutation result before returning success', () => {
    expect(branch).toMatch(/const \{ error: itemUpdateError \} = await supabase[\s\S]*writer_pacing_revision_items[\s\S]*\.update/);
    expect(branch).toMatch(/if \(itemUpdateError\)[\s\S]*Failed to update Revision Item/);
    expect(branch).toMatch(/const \{ error: setUpdateError \} = await supabase[\s\S]*writer_pacing_revision_sets[\s\S]*\.update/);
    expect(branch).toMatch(/if \(setUpdateError\)[\s\S]*Failed to update Revision Set/);
    const successIndex = branch.lastIndexOf('success: true');
    expect(successIndex).toBeGreaterThan(branch.indexOf('if (itemUpdateError)'));
    expect(successIndex).toBeGreaterThan(branch.indexOf('if (setUpdateError)'));
  });

  it('never treats an archived-race failure-ledger update as a successful failure write', () => {
    expect(branch).toMatch(/const \{ error: failureUpdateError \} = await supabase[\s\S]*failure_ledger/);
    expect(branch).toMatch(/if \(failureUpdateError\)[\s\S]*Failed to record page candidate failure/);
  });
});
