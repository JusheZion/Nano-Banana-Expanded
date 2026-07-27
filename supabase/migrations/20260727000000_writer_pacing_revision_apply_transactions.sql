-- Atomically close and reopen Pacing Revision Apply so set and child states
-- cannot diverge if the client disconnects between table updates.

create or replace function public.complete_writer_pacing_revision_apply(
  p_set_id uuid,
  p_change_ids uuid[],
  p_snapshot jsonb,
  p_expectation jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expected_count integer;
  v_affected_count integer;
  v_issue_id uuid;
  v_latest_outline_id uuid;
  v_latest_outline_json jsonb;
  v_page_expectation jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  v_expected_count := cardinality(p_change_ids);
  if v_expected_count is null
    or v_expected_count = 0
    or v_expected_count <> (
      select count(distinct change_id)
      from unnest(p_change_ids) as requested(change_id)
    )
  then
    raise exception 'A non-empty unique change id list is required';
  end if;

  select revision_set.issue_id
  into v_issue_id
  from public.writer_pacing_revision_sets revision_set
  join public.writer_issues issue on issue.id = revision_set.issue_id
  join public.writer_series series on series.id = issue.series_id
  where revision_set.id = p_set_id
    and revision_set.status = 'applying'
    and series.owner_id = auth.uid()
  for update of revision_set;
  if not found then
    raise exception 'Applying Revision Set was not found for the authenticated owner';
  end if;

  if p_expectation is null
    or jsonb_typeof(p_expectation) <> 'object'
    or (p_expectation->>'issue_id')::uuid <> v_issue_id
    or jsonb_typeof(p_expectation->'pages') <> 'array'
    or (p_expectation->>'target_page_count')::integer < 0
  then
    raise exception 'Completion expectation is invalid';
  end if;

  if p_snapshot is null
    or jsonb_typeof(p_snapshot) <> 'object'
    or jsonb_typeof(p_snapshot->'appliedIds') <> 'array'
    or jsonb_typeof(p_snapshot->'createdPages') <> 'array'
    or (p_snapshot->>'sourcePageCount')::integer < 0
    or jsonb_array_length(p_snapshot->'appliedIds') <> v_expected_count
    or exists (
      select 1 from unnest(p_change_ids) requested(change_id)
      where not exists (
        select 1
        from jsonb_array_elements_text(p_snapshot->'appliedIds') applied_id
        where applied_id::uuid = requested.change_id
      )
    )
    or (p_snapshot->>'targetPageCount')::integer
      <> (p_expectation->>'target_page_count')::integer
    or (
      coalesce((p_snapshot->>'outlineApplied')::boolean, false)
      and (p_snapshot->>'appliedOutlineId')::uuid
        <> (p_expectation->>'outline_id')::uuid
    )
    or exists (
      select 1
      from jsonb_array_elements(p_expectation->'pages') expected_page
      where (expected_page->>'page_number')::integer
          > (p_snapshot->>'sourcePageCount')::integer
        and not exists (
          select 1
          from jsonb_array_elements(p_snapshot->'createdPages') created_page
          where (created_page->>'pageNumber')::integer
              = (expected_page->>'page_number')::integer
            and (created_page->>'pageId')::uuid
              = (expected_page->>'id')::uuid
        )
    )
  then
    raise exception 'Completion snapshot does not match expected live identities';
  end if;

  if exists (
    select 1
    from public.writer_pacing_revision_changes change
    join public.writer_pacing_revision_items item on item.id = change.item_id
    where item.revision_set_id = p_set_id
      and change.id = any(p_change_ids)
      and change.layer <> 'outline'
      and not exists (
        select 1
        from jsonb_array_elements(p_expectation->'pages') expected_page
        where (expected_page->>'page_number')::integer = change.page_number
          and (change.page_id is null or (expected_page->>'id')::uuid = change.page_id)
          and (
            (
              change.layer = 'beats'
              and expected_page ? 'beats_json'
              and expected_page->'beats_json'
                is not distinct from coalesce(change.edited_candidate, change.ai_proposal)
            )
            or (
              change.layer = 'dialogue'
              and expected_page ? 'script_text'
              and expected_page->'script_text'
                is not distinct from coalesce(change.edited_candidate, change.ai_proposal)
            )
          )
      )
  ) then
    raise exception 'Completion expectation does not match approved candidates';
  end if;

  -- Lock live content before validating it so no write can race between
  -- verification and the status transition.
  lock table public.writer_pages, public.writer_issue_outlines in share row exclusive mode;
  perform 1
  from public.writer_pages page
  where page.issue_id = v_issue_id
  for update;

  select count(*)
  into v_affected_count
  from public.writer_pages page
  where page.issue_id = v_issue_id;
  if v_affected_count <> (p_expectation->>'target_page_count')::integer then
    raise exception 'Target page count changed before completion';
  end if;

  select outline.id, outline.outline_json
  into v_latest_outline_id, v_latest_outline_json
  from public.writer_issue_outlines outline
  where outline.issue_id = v_issue_id
  order by outline.version desc
  limit 1
  for update;
  if v_latest_outline_id is distinct from (p_expectation->>'outline_id')::uuid
    or v_latest_outline_json is distinct from p_expectation->'outline_json'
  then
    raise exception 'Target outline changed before completion';
  end if;

  for v_page_expectation in
    select value from jsonb_array_elements(p_expectation->'pages')
  loop
    select count(*)
    into v_affected_count
    from public.writer_pages page
    where page.issue_id = v_issue_id
      and page.id = (v_page_expectation->>'id')::uuid
      and page.page_number = (v_page_expectation->>'page_number')::integer
      and (
        not (v_page_expectation ? 'beats_json')
        or page.beats_json is not distinct from v_page_expectation->'beats_json'
      )
      and (
        not (v_page_expectation ? 'script_text')
        or coalesce(to_jsonb(page.script_text), 'null'::jsonb)
          is not distinct from v_page_expectation->'script_text'
      );
    if v_affected_count <> 1 then
      raise exception 'Target page content changed before completion';
    end if;
  end loop;

  update public.writer_pacing_revision_changes change
  set generation_status = 'applied',
      applied_at = now()
  from public.writer_pacing_revision_items item
  where change.item_id = item.id
    and item.revision_set_id = p_set_id
    and change.id = any(p_change_ids)
    and change.decision = 'approved'
    and change.generation_status = 'ready';
  get diagnostics v_affected_count = row_count;
  if v_affected_count <> v_expected_count then
    raise exception 'Completion did not update every requested ready change';
  end if;

  update public.writer_pacing_revision_sets
  set status = 'applied',
      apply_snapshot = p_snapshot,
      recovery_status = null
  where id = p_set_id
    and status = 'applying';
  get diagnostics v_affected_count = row_count;
  if v_affected_count <> 1 then
    raise exception 'Completion did not update the applying Revision Set';
  end if;

  return true;
end;
$$;

create or replace function public.reopen_writer_pacing_revision_after_undo(
  p_set_id uuid,
  p_change_ids uuid[]
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expected_count integer;
  v_affected_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  v_expected_count := cardinality(p_change_ids);
  if v_expected_count is null
    or v_expected_count = 0
    or v_expected_count <> (
      select count(distinct change_id)
      from unnest(p_change_ids) as requested(change_id)
    )
  then
    raise exception 'A non-empty unique change id list is required';
  end if;

  perform 1
  from public.writer_pacing_revision_sets revision_set
  join public.writer_issues issue on issue.id = revision_set.issue_id
  join public.writer_series series on series.id = issue.series_id
  where revision_set.id = p_set_id
    and revision_set.status = 'applied'
    and series.owner_id = auth.uid()
  for update of revision_set;
  if not found then
    raise exception 'Applied Revision Set was not found for the authenticated owner';
  end if;

  update public.writer_pacing_revision_changes change
  set generation_status = 'ready',
      applied_at = null
  from public.writer_pacing_revision_items item
  where change.item_id = item.id
    and item.revision_set_id = p_set_id
    and change.id = any(p_change_ids)
    and change.generation_status = 'applied';
  get diagnostics v_affected_count = row_count;
  if v_affected_count <> v_expected_count then
    raise exception 'Undo did not update every requested applied change';
  end if;

  update public.writer_pacing_revision_sets
  set status = 'ready',
      recovery_status = 'undone'
  where id = p_set_id
    and status = 'applied';
  get diagnostics v_affected_count = row_count;
  if v_affected_count <> 1 then
    raise exception 'Undo did not reopen the applied Revision Set';
  end if;

  return true;
end;
$$;

revoke all on function public.complete_writer_pacing_revision_apply(uuid, uuid[], jsonb, jsonb) from public;
revoke all on function public.reopen_writer_pacing_revision_after_undo(uuid, uuid[]) from public;
grant execute on function public.complete_writer_pacing_revision_apply(uuid, uuid[], jsonb, jsonb) to authenticated;
grant execute on function public.reopen_writer_pacing_revision_after_undo(uuid, uuid[]) to authenticated;
