import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260727000000_writer_pacing_revision_apply_transactions.sql',
), 'utf8');

describe('Pacing Revision Apply transaction migration', () => {
  it('uses authenticated owner-scoped invoker functions with guarded exact transitions', () => {
    expect(sql).toMatch(/security invoker/gi);
    expect(sql).toMatch(/auth\.uid\(\) is null/gi);
    expect(sql).toMatch(/series\.owner_id = auth\.uid\(\)/gi);
    expect(sql).toMatch(/revision_set\.status = 'applying'/);
    expect(sql).toMatch(/revision_set\.status = 'applied'/);
    expect(sql).toMatch(/item\.revision_set_id = p_set_id/gi);
    expect(sql).toMatch(/get diagnostics v_affected_count = row_count/gi);
    expect(sql).toMatch(/v_affected_count <> v_expected_count/gi);
    expect(sql).toMatch(/grant execute .* to authenticated/gi);
    expect(sql).toMatch(/revoke all .* from public/gi);
  });

  it('locks and revalidates target identity/content before status mutation', () => {
    const lockIndex = sql.indexOf('from public.writer_pages page\n  where page.issue_id = v_issue_id\n  for update');
    const contentGuardIndex = sql.indexOf('Target page content changed before completion');
    const statusMutationIndex = sql.indexOf('update public.writer_pacing_revision_changes change');
    expect(lockIndex).toBeGreaterThan(0);
    expect(sql).toMatch(/lock table public\.writer_pages, public\.writer_issue_outlines in share row exclusive mode/);
    expect(contentGuardIndex).toBeGreaterThan(lockIndex);
    expect(statusMutationIndex).toBeGreaterThan(contentGuardIndex);
    expect(sql).toMatch(/Target outline changed before completion/);
    expect(sql).toMatch(/Target page-number set changed before completion/);
    expect(sql).toMatch(/Completion expectation does not match approved candidates/);
    expect(sql).toMatch(/Completion snapshot does not match expected live identities/);
    expect(sql).toMatch(/change\.decision = 'approved'/);
  });

  it('rejects a same-count gap plus out-of-range replacement before completion', () => {
    expect(sql).toMatch(/count\(distinct page\.page_number\)/);
    expect(sql).toMatch(/v_min_page_number <> 1/);
    expect(sql).toMatch(/v_max_page_number <> \(p_expectation->>'target_page_count'\)::integer/);
    expect(sql).toMatch(/from generate_series/);
    expect(sql).toMatch(/page\.page_number > \(p_expectation->>'target_page_count'\)::integer/);
    expect(sql.indexOf('Target page-number set changed before completion'))
      .toBeLessThan(sql.indexOf('update public.writer_pacing_revision_changes change'));
  });
});
