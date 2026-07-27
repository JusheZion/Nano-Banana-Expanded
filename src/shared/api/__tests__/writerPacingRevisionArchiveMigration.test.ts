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
    expect(sql).toMatch(/add column if not exists archived_from_status text/i);
    expect(sql).toMatch(/add column if not exists archived_at timestamptz/i);
    expect(sql).toMatch(/status = 'archived'[\s\S]*archived_from_status in\s*\(\s*'ready',\s*'partially_ready',\s*'applied',\s*'failed'\s*\)[\s\S]*archived_at is not null/i);
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
    const archiveStart = sql.indexOf('create or replace function public.archive_writer_pacing_revision_set');
    const archiveEnd = sql.indexOf('revoke all on function public.archive_writer_pacing_revision_set', archiveStart);
    const archive = sql.slice(archiveStart, archiveEnd);
    expect(archive).toMatch(/update public\.writer_pacing_revision_sets\s+revision_set\s+set archived_from_status = revision_set\.status,\s*archived_at = now\(\),\s*status = 'archived'/i);
    expect(sql).toMatch(/revoke all on function public\.archive_writer_pacing_revision_set\(uuid, text, timestamptz\) from public/i);
    expect(sql).toMatch(/grant execute on function public\.archive_writer_pacing_revision_set\(uuid, text, timestamptz\) to authenticated/i);

    expect(archive).not.toMatch(/(?:update|insert into|delete from)\s+public\.writer_pages/i);
    expect(archive).not.toMatch(/(?:update|insert into|delete from)\s+public\.writer_issue_outlines/i);
    expect(archive).not.toMatch(/(?:update|insert into|delete from)\s+public\.writer_pacing_revision_items/i);
    expect(archive).not.toMatch(/(?:update|insert into|delete from)\s+public\.writer_pacing_revision_changes/i);
  });

  it('blocks archived set, item, and child mutations even for service-role traffic', () => {
    expect(sql).toMatch(/create or replace function public\.guard_archived_pacing_revision_set_mutation\(\)/i);
    expect(sql).toMatch(/create or replace function public\.guard_archived_pacing_revision_item_mutation\(\)/i);
    expect(sql).toMatch(/create or replace function public\.guard_archived_pacing_revision_change_mutation\(\)/i);
    expect(sql.match(/security definer/gi)).toHaveLength(8);
    expect(sql).toMatch(/before insert or update or delete on public\.writer_pacing_revision_sets/i);
    expect(sql).toMatch(/before insert or update or delete on public\.writer_pacing_revision_items/i);
    expect(sql).toMatch(/before insert or update or delete on public\.writer_pacing_revision_changes/i);
    expect(sql).toMatch(/old\.status = 'archived'/i);
    expect(sql).toMatch(/new\.status = 'archived'[\s\S]*current_setting\('app\.pacing_revision_archive_set_id', true\)/i);
    expect(sql).toMatch(/old\.status not in\s*\(\s*'ready',\s*'partially_ready',\s*'applied',\s*'failed'\s*\)/i);
    expect(sql).toMatch(/set_config\('app\.pacing_revision_archive_set_id', p_set_id::text, true\)/i);
    expect(sql).toMatch(/v_revision_set_status = 'archived'/i);
    expect(sql.match(/for update(?: of revision_set)?/gi)?.length).toBeGreaterThanOrEqual(5);
    expect(sql).not.toMatch(/disable trigger/i);
  });

  it('serializes page-preview lease acquisition against archive and concurrent previews', () => {
    expect(sql).toMatch(/writer_pacing_revision_sets_generation_lease_check[\s\S]*status = 'generating'[\s\S]*generation_lease_previous_status in\s*\(\s*'ready',\s*'partially_ready',\s*'failed'\s*\)/i);
    expect(sql).toMatch(/create or replace function public\.acquire_writer_pacing_revision_generation_lease/i);
    expect(sql).toMatch(/p_expected_status text[\s\S]*p_expected_updated_at timestamptz[\s\S]*p_lease_id uuid/i);
    expect(sql).toMatch(/p_expected_status not in\s*\(\s*'ready',\s*'partially_ready',\s*'failed'\s*\)/i);
    expect(sql).toMatch(/revision_set\.status = p_expected_status[\s\S]*revision_set\.updated_at = p_expected_updated_at[\s\S]*for update of revision_set/i);
    expect(sql).toMatch(/set status = 'generating',[\s\S]*generation_lease_id = p_lease_id,[\s\S]*generation_lease_previous_status = p_expected_status/i);
    expect(sql).toMatch(/generation_lease_expires_at = clock_timestamp\(\) \+ interval '2 minutes'/i);
    expect(sql).toMatch(/get diagnostics v_affected_count = row_count[\s\S]*return v_affected_count = 1/i);
    expect(sql).toMatch(/grant execute on function public\.acquire_writer_pacing_revision_generation_lease\(uuid, text, timestamptz, uuid\) to authenticated/i);
    expect(sql).toMatch(/archive_writer_pacing_revision_set[\s\S]*revision_set\.status in\s*\(\s*'ready',\s*'partially_ready',\s*'applied',\s*'failed'\s*\)/i);
  });

  it('releases only the matching generation lease into an explicit final state', () => {
    expect(sql).toMatch(/create or replace function public\.release_writer_pacing_revision_generation_lease/i);
    expect(sql).toMatch(/p_lease_id uuid[\s\S]*p_final_status text[\s\S]*p_progress_json jsonb[\s\S]*p_failure_ledger jsonb/i);
    expect(sql).toMatch(/p_final_status not in\s*\(\s*'ready',\s*'partially_ready',\s*'failed'\s*\)/i);
    expect(sql).toMatch(/revision_set\.status = 'generating'[\s\S]*revision_set\.generation_lease_id = p_lease_id[\s\S]*for update of revision_set/i);
    expect(sql).toMatch(/set status = p_final_status,[\s\S]*generation_lease_id = null,[\s\S]*generation_lease_previous_status = null,[\s\S]*progress_json = coalesce\(p_progress_json, revision_set\.progress_json\),[\s\S]*failure_ledger = coalesce\(p_failure_ledger, revision_set\.failure_ledger\)/i);
    expect(sql).toMatch(/grant execute on function public\.release_writer_pacing_revision_generation_lease\(uuid, uuid, text, jsonb, jsonb\) to authenticated/i);
  });

  it('recovers only an expired owner-scoped lease and clears all lease metadata', () => {
    expect(sql).toMatch(/create or replace function public\.recover_stale_writer_pacing_revision_generation_lease/i);
    expect(sql).toMatch(/generation_lease_expires_at < clock_timestamp\(\)[\s\S]*series\.owner_id = auth\.uid\(\)[\s\S]*for update of revision_set/i);
    expect(sql).toMatch(/when v_previous_status in\s*\(\s*'ready',\s*'partially_ready',\s*'failed'\s*\)[\s\S]*else 'partially_ready'/i);
    expect(sql).toMatch(/generation_lease_id = null,[\s\S]*generation_lease_previous_status = null,[\s\S]*generation_lease_expires_at = null/i);
    expect(sql).toMatch(/grant execute on function public\.recover_stale_writer_pacing_revision_generation_lease\(uuid\) to authenticated/i);
  });

  it('commits candidates, item state, aggregate state, and lease release in one fenced transaction', () => {
    expect(sql).toMatch(/create or replace function public\.commit_writer_pacing_revision_page_preview/i);
    expect(sql).toMatch(/security definer[\s\S]*set search_path = public/i);
    expect(sql).toMatch(/p_lease_id uuid[\s\S]*p_change_rows jsonb[\s\S]*p_item_id uuid[\s\S]*p_item_generation_status text[\s\S]*p_final_status text[\s\S]*p_progress_json jsonb[\s\S]*p_failure_ledger jsonb/i);
    expect(sql).toMatch(/revision_set\.status = 'generating'[\s\S]*revision_set\.generation_lease_id = p_lease_id[\s\S]*revision_set\.generation_lease_expires_at >= clock_timestamp\(\)[\s\S]*series\.owner_id = auth\.uid\(\)[\s\S]*for update of revision_set/i);
    const commitStart = sql.indexOf('create or replace function public.commit_writer_pacing_revision_page_preview');
    const commitEnd = sql.indexOf('create or replace function public.archive_writer_pacing_revision_set', commitStart);
    const commit = sql.slice(commitStart, commitEnd);
    expect(commit.indexOf('for update of revision_set')).toBeLessThan(commit.indexOf('insert into public.writer_pacing_revision_changes'));
    expect(commit).toMatch(/set_config\(\s*'app\.pacing_revision_generation_write_lease_id',\s*p_lease_id::text,\s*true/i);
    expect(commit).toMatch(/insert into public\.writer_pacing_revision_changes[\s\S]*on conflict \(item_id, layer, target_key\) do update/i);
    expect(commit).toMatch(/update public\.writer_pacing_revision_items[\s\S]*generation_status = p_item_generation_status[\s\S]*where item\.id = p_item_id[\s\S]*item\.revision_set_id = p_set_id/i);
    expect(commit).toMatch(/get diagnostics v_item_count = row_count[\s\S]*if v_item_count <> 1 then[\s\S]*raise exception/i);
    expect(commit).toMatch(/set status = p_final_status,[\s\S]*generation_lease_id = null,[\s\S]*generation_lease_previous_status = null,[\s\S]*generation_lease_expires_at = null/i);
    expect(commit).toMatch(/return jsonb_build_object\(\s*'success', true,[\s\S]*'changes', p_change_rows/i);
    expect(sql).toMatch(/grant execute on function public\.commit_writer_pacing_revision_page_preview\(uuid, uuid, jsonb, uuid, text, text, jsonb, jsonb\) to authenticated/i);
  });

  it('fences stale request A after recovery and request B acquisition before any child write', () => {
    const commitStart = sql.indexOf('create or replace function public.commit_writer_pacing_revision_page_preview');
    const commitEnd = sql.indexOf('create or replace function public.archive_writer_pacing_revision_set', commitStart);
    const commit = sql.slice(commitStart, commitEnd);
    expect(commit).toMatch(/generation_lease_id = p_lease_id/);
    expect(commit).toMatch(/generation_lease_expires_at >= clock_timestamp\(\)/);
    expect(commit).toMatch(/if not found then[\s\S]*return jsonb_build_object\(\s*'success', false/i);
    expect(commit.indexOf('if not found then')).toBeLessThan(commit.indexOf('insert into public.writer_pacing_revision_changes'));
    expect(sql).toMatch(/recover_stale_writer_pacing_revision_generation_lease[\s\S]*generation_lease_expires_at < clock_timestamp\(\)/i);
    expect(sql).toMatch(/acquire_writer_pacing_revision_generation_lease[\s\S]*generation_lease_id is null[\s\S]*for update of revision_set/i);
  });

  it('advances the parent aggregate guard for every direct item or child mutation', () => {
    expect(sql).toMatch(/create or replace function public\.set_writer_pacing_revision_updated_at\(\)[\s\S]*new\.updated_at = clock_timestamp\(\)/i);
    expect(sql).toMatch(/create or replace function public\.touch_writer_pacing_revision_parent\(\)/i);
    expect(sql).toMatch(/after insert or update or delete on public\.writer_pacing_revision_items/i);
    expect(sql).toMatch(/after insert or update or delete on public\.writer_pacing_revision_changes/i);
    expect(sql).toMatch(/update public\.writer_pacing_revision_sets[\s\S]*set updated_at = clock_timestamp\(\)/i);
    expect(sql).toMatch(/old\.revision_set_id[\s\S]*new\.revision_set_id/i);
    expect(sql).toMatch(/old\.item_id[\s\S]*new\.item_id/i);
  });

  it('blocks ordinary edits during generation and every direct lease metadata transition', () => {
    expect(sql).toMatch(/v_revision_set_status = 'generating'[\s\S]*current_setting\('app\.pacing_revision_generation_write_lease_id', true\)[\s\S]*v_generation_lease_id::text/i);
    expect(sql.match(/Pacing Revision (?:Items|Changes) are locked while page preview is generating/gi)).toHaveLength(4);
    expect(sql).toMatch(/old\.generation_lease_previous_status is distinct from new\.generation_lease_previous_status/i);
    expect(sql).toMatch(/old\.generation_lease_expires_at is distinct from new\.generation_lease_expires_at/i);
    expect(sql).toMatch(/status <> 'generating'[\s\S]*generation_lease_id is null[\s\S]*generation_lease_previous_status is null[\s\S]*generation_lease_expires_at is null/i);
  });
});
