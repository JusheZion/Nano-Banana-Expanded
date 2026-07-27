import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260727010000_writer_pacing_revision_legacy_undo.sql',
), 'utf8');

describe('Pacing Revision legacy Undo migration', () => {
  it('normalizes only authenticated owner-scoped legacy applied snapshots', () => {
    expect(sql).toMatch(/create or replace function public\.undo_legacy_writer_pacing_revision_apply/);
    expect(sql).toMatch(/security invoker/);
    expect(sql).toMatch(/auth\.uid\(\) is null/);
    expect(sql).toMatch(/series\.owner_id = auth\.uid\(\)/);
    expect(sql).toMatch(/revision_set\.status = 'applied'/);
    expect(sql).toMatch(/for update of revision_set/);
    expect(sql).toMatch(/v_snapshot \? 'plannedOutlineId'/);
    expect(sql).toMatch(/v_snapshot \? 'createdPages'/);
    expect(sql).toMatch(/raise exception 'Snapshot is not an eligible legacy applied snapshot'/);
  });

  it('derives modern authority without mutating live pages or outlines itself', () => {
    expect(sql).toMatch(/count\(distinct page\.page_number\)/);
    expect(sql).toMatch(/v_min_page_number <> 1/);
    expect(sql).toMatch(/v_max_page_number <> v_page_count/);
    expect(sql).toMatch(/'createdPages', '\[\]'::jsonb/);
    expect(sql).toMatch(/'sourcePageCount', v_page_count/);
    expect(sql).toMatch(/'targetPageCount', v_page_count/);
    expect(sql).toMatch(/'appliedOutlineJson', coalesce\(v_applied_outline_json, 'null'::jsonb\)/);
    expect(sql).not.toMatch(/update public\.writer_pages/);
    expect(sql).not.toMatch(/delete from public\.writer_pages/);
    expect(sql).not.toMatch(/delete from public\.writer_issue_outlines/);
  });

  it('delegates the actual rollback to the strict transactional Undo function', () => {
    const snapshotUpdate = sql.indexOf('set apply_snapshot = v_normalized_snapshot');
    const strictUndo = sql.indexOf('return public.undo_writer_pacing_revision_apply(p_set_id)');

    expect(snapshotUpdate).toBeGreaterThan(-1);
    expect(strictUndo).toBeGreaterThan(snapshotUpdate);
    expect(sql).toMatch(/revoke all on function public\.undo_legacy_writer_pacing_revision_apply\(uuid\) from public/);
    expect(sql).toMatch(/grant execute on function public\.undo_legacy_writer_pacing_revision_apply\(uuid\) to authenticated/);
  });
});
