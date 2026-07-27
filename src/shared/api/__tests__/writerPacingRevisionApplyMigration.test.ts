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
    expect(sql).toMatch(/p_snapshot->'appliedOutlineJson'/);
    expect(sql).toMatch(/is distinct from p_expectation->'outline_json'/);
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

  it('performs authoritative Undo restoration, cleanup, and reopen in one rollback-safe RPC', () => {
    const undoStart = sql.indexOf('create or replace function public.undo_writer_pacing_revision_apply');
    const undoSql = sql.slice(undoStart);
    const firstRestore = undoSql.indexOf('update public.writer_pages page');
    const createdDelete = undoSql.indexOf('delete from public.writer_pages page');
    const outlineDelete = undoSql.indexOf('delete from public.writer_issue_outlines outline');
    const reopen = undoSql.indexOf('set status = v_reopen_status');

    expect(undoStart).toBeGreaterThan(-1);
    expect(undoSql).toMatch(/revision_set\.apply_snapshot/);
    expect(undoSql).toMatch(/revision_set\.status = 'applied'/);
    expect(undoSql).toMatch(/for update of revision_set/);
    expect(undoSql).toMatch(/from public\.writer_issues issue[\s\S]*for update/);
    expect(undoSql).toMatch(/lock table\s+public\.writer_pacing_revision_items,\s+public\.writer_pacing_revision_changes/);
    expect(undoSql).toMatch(/for update of item, change/);
    expect(undoSql).toMatch(/lock table public\.writer_pages, public\.writer_issue_outlines in share row exclusive mode/);
    expect(undoSql).toMatch(/Applied page content changed before Undo/);
    expect(undoSql).toMatch(/Applied outline changed before Undo/);
    expect(undoSql).toMatch(/Target page-number set changed before Undo/);
    expect(undoSql).toMatch(/Applied recovery snapshot does not match exact page-layer ownership/);
    expect(firstRestore).toBeGreaterThan(-1);
    expect(createdDelete).toBeGreaterThan(firstRestore);
    expect(outlineDelete).toBeGreaterThan(createdDelete);
    expect(reopen).toBeGreaterThan(outlineDelete);
    expect(undoSql).toMatch(/raise exception 'Undo restoration verification failed'/);
    expect(undoSql).toMatch(/raise exception 'Undo did not delete every planned created page'/);
    expect(undoSql).toMatch(/raise exception 'Undo did not delete the applied outline'/);
    expect(undoSql).toMatch(/grant execute on function public\.undo_writer_pacing_revision_apply\(uuid\) to authenticated/);
  });
});
