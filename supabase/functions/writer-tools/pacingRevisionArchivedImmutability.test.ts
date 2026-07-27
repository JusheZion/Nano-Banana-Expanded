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
    expect(branch).toMatch(/\['applied', 'discarded', 'applying', 'archived', 'generating'\]\.includes\(revisionSet\.status\)/);
    expect(branch.indexOf("'archived'")).toBeLessThan(
      branch.indexOf('executePacingRevisionPagePreviewFlow'),
    );
  });

  it('blocks a second preview and acquires one guarded generation lease before AI or persistence', () => {
    expect(branch).toMatch(/\['applied', 'discarded', 'applying', 'archived', 'generating'\]\.includes\(revisionSet\.status\)/);
    expect(branch).toMatch(/const generationLeaseId = crypto\.randomUUID\(\)/);
    expect(branch).toMatch(/rpc\(\s*'acquire_writer_pacing_revision_generation_lease',[\s\S]*p_expected_status: revisionSet\.status,[\s\S]*p_expected_updated_at: revisionSet\.updated_at,[\s\S]*p_lease_id: generationLeaseId/);
    expect(branch).toMatch(/if \(leaseError \|\| leaseAcquired !== true\)[\s\S]*Page preview could not acquire the Revision Set generation lease/);
    const acquireIndex = branch.indexOf("'acquire_writer_pacing_revision_generation_lease'");
    expect(acquireIndex).toBeGreaterThan(-1);
    expect(acquireIndex).toBeLessThan(branch.indexOf('executePacingRevisionPagePreviewFlow'));
  });

  it('recovers an expired lease but requires a fresh retry instead of joining the old request', () => {
    expect(branch).toMatch(/if \(revisionSet\.status === 'generating'\)[\s\S]*rpc\(\s*'recover_stale_writer_pacing_revision_generation_lease'/);
    expect(branch).toMatch(/staleLeaseRecovered === true[\s\S]*expired page-preview lease was recovered; retry the page preview/);
    expect(branch).toMatch(/Another page preview is already running for this Revision Set/);
  });

  it('releases the matching lease after success and recoverable failures', () => {
    expect(branch).toMatch(/const releaseGenerationLease = async[\s\S]*rpc\(\s*'release_writer_pacing_revision_generation_lease'/);
    expect(branch).toMatch(/p_lease_id: generationLeaseId[\s\S]*p_final_status: finalStatus/);
    expect(branch).toMatch(/if \(releaseError \|\| released !== true\)[\s\S]*Failed to release Revision Set generation lease/);
    expect(branch).not.toMatch(/\.update\(\{\s*status: 'partially_ready'/);
    expect(branch).not.toMatch(/\.update\(\{\s*status: completedPages/);
    expect(branch).toMatch(/await releaseGenerationLease\(\s*'partially_ready'/);
    expect(branch).toMatch(/const finalStatus = completedPages\.length >= totalPages[\s\S]*await releaseGenerationLease\(\s*finalStatus/);
  });

  it('checks every parent/item mutation result before returning success', () => {
    expect(branch).toMatch(/const \{ data: updatedItems, error: itemUpdateError \} = await supabase[\s\S]*writer_pacing_revision_items[\s\S]*\.update[\s\S]*\.select\('id'\)/);
    expect(branch).toMatch(/if \(itemUpdateError \|\| updatedItems\?\.length !== 1\)[\s\S]*Failed to update Revision Item/);
    expect(branch).toMatch(/const releaseFailure = await releaseGenerationLease\([\s\S]*if \(releaseFailure\)[\s\S]*Failed to release Revision Set generation lease/);
    const successIndex = branch.lastIndexOf('success: true');
    expect(successIndex).toBeGreaterThan(branch.indexOf('updatedItems?.length !== 1'));
    expect(successIndex).toBeGreaterThan(branch.lastIndexOf('if (releaseFailure)'));
  });

  it('never treats an archived-race failure-ledger update as a successful failure write', () => {
    expect(branch).toMatch(/const nextFailureLedger = projectPacingRevisionFailureLedger/);
    expect(branch).toMatch(/await releaseGenerationLease\(\s*'partially_ready',[\s\S]*nextFailureLedger/);
    expect(branch).toMatch(/if \(releaseFailure\)[\s\S]*Failed to record page candidate failure and release the generation lease/);
  });
});
