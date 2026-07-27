import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260727030000_writer_pacing_revision_archive.sql',
), 'utf8');

describe('Pacing Revision archive migration', () => {
  it('adds archived to the durable status constraint', () => {
    expect(sql).toMatch(/check\s*\(\s*status in\s*\([\s\S]*'archived'[\s\S]*\)\s*\)/i);
  });

  it('uses an authenticated owner-scoped invoker function and locks the set row', () => {
    expect(sql).toMatch(/create or replace function public\.archive_writer_pacing_revision_set/);
    expect(sql).toMatch(/language plpgsql/i);
    expect(sql).toMatch(/security invoker/i);
    expect(sql).toMatch(/set search_path = public/i);
    expect(sql).toMatch(/auth\.uid\(\) is null/i);
    expect(sql).toMatch(/series\.owner_id = auth\.uid\(\)/i);
    expect(sql).toMatch(/for update of revision_set/i);
  });

  it('requires eligible exact status and updated_at guards and verifies one row', () => {
    expect(sql).toMatch(/p_expected_status not in\s*\(\s*'ready',\s*'partially_ready',\s*'applied',\s*'failed'\s*\)/i);
    expect(sql).toMatch(/revision_set\.status in\s*\(\s*'ready',\s*'partially_ready',\s*'applied',\s*'failed'\s*\)/i);
    expect(sql).toMatch(/revision_set\.status = p_expected_status/i);
    expect(sql).toMatch(/revision_set\.updated_at = p_expected_updated_at/i);
    expect(sql).toMatch(/get diagnostics v_affected_count = row_count/i);
    expect(sql).toMatch(/v_affected_count <> 1/i);
  });

  it('updates only the set status and exposes the RPC only to authenticated users', () => {
    expect(sql).toMatch(/update public\.writer_pacing_revision_sets\s+revision_set\s+set status = 'archived'/i);
    expect(sql).toMatch(/revoke all on function public\.archive_writer_pacing_revision_set\(uuid, text, timestamptz\) from public/i);
    expect(sql).toMatch(/grant execute on function public\.archive_writer_pacing_revision_set\(uuid, text, timestamptz\) to authenticated/i);

    expect(sql).not.toMatch(/(?:update|insert into|delete from)\s+public\.writer_pages/i);
    expect(sql).not.toMatch(/(?:update|insert into|delete from)\s+public\.writer_issue_outlines/i);
    expect(sql).not.toMatch(/(?:update|insert into|delete from)\s+public\.writer_pacing_revision_items/i);
    expect(sql).not.toMatch(/(?:update|insert into|delete from)\s+public\.writer_pacing_revision_changes/i);
  });
});
