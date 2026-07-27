-- Safely adapt pre-transaction Pacing Revision Apply snapshots so the strict
-- transactional Undo can restore them. This adapter never mutates live story
-- content itself; it only derives the authority fields that older snapshots
-- could not persist, then delegates to undo_writer_pacing_revision_apply.

create or replace function public.undo_legacy_writer_pacing_revision_apply(
  p_set_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_snapshot_keys text[];
  v_normalized_snapshot jsonb;
  v_issue_id uuid;
  v_outline_applied boolean;
  v_applied_outline_id uuid;
  v_applied_outline_json jsonb;
  v_page_count integer;
  v_distinct_page_count integer;
  v_min_page_number integer;
  v_max_page_number integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select
    revision_set.issue_id,
    revision_set.apply_snapshot
  into
    v_issue_id,
    v_snapshot
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

  -- Modern, future, or partially corrupted snapshots must stay on the strict
  -- path. Accept only the six fields written by the pre-transaction Apply.
  if v_snapshot is null
    or jsonb_typeof(v_snapshot) <> 'object'
  then
    raise exception 'Snapshot is not an eligible legacy applied snapshot';
  end if;

  select array_agg(snapshot_key order by snapshot_key)
  into v_snapshot_keys
  from jsonb_object_keys(v_snapshot) snapshot_key;

  if v_snapshot_keys is distinct from array[
      'appliedIds',
      'appliedOutlineId',
      'beats',
      'dialogue',
      'outline',
      'outlineApplied'
    ]::text[]
    or jsonb_typeof(v_snapshot->'appliedIds') <> 'array'
    or jsonb_typeof(v_snapshot->'beats') <> 'array'
    or jsonb_typeof(v_snapshot->'dialogue') <> 'array'
    or jsonb_typeof(v_snapshot->'outline') <> 'object'
    or jsonb_typeof(v_snapshot->'outlineApplied') <> 'boolean'
  then
    raise exception 'Snapshot is not an eligible legacy applied snapshot';
  end if;

  if jsonb_array_length(v_snapshot->'appliedIds') = 0
    or jsonb_array_length(v_snapshot->'appliedIds') <> (
      select count(distinct applied_id)
      from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
    )
    or exists (
      select 1
      from jsonb_array_elements(v_snapshot->'beats') prior
      where jsonb_typeof(prior) <> 'object'
        or jsonb_typeof(prior->'pageId') <> 'string'
        or not (prior ? 'value')
        or jsonb_typeof(prior->'value') not in ('object', 'null')
    )
    or exists (
      select 1
      from jsonb_array_elements(v_snapshot->'dialogue') prior
      where jsonb_typeof(prior) <> 'object'
        or jsonb_typeof(prior->'pageId') <> 'string'
        or not (prior ? 'value')
        or jsonb_typeof(prior->'value') not in ('string', 'null')
    )
    or jsonb_array_length(v_snapshot->'beats') <> (
      select count(distinct prior->>'pageId')
      from jsonb_array_elements(v_snapshot->'beats') prior
    )
    or jsonb_array_length(v_snapshot->'dialogue') <> (
      select count(distinct prior->>'pageId')
      from jsonb_array_elements(v_snapshot->'dialogue') prior
    )
  then
    raise exception 'Snapshot is not an eligible legacy applied snapshot';
  end if;

  v_outline_applied := (v_snapshot->>'outlineApplied')::boolean;
  if v_outline_applied then
    if jsonb_typeof(v_snapshot->'appliedOutlineId') <> 'string' then
      raise exception 'Snapshot is not an eligible legacy applied snapshot';
    end if;
    v_applied_outline_id := (v_snapshot->>'appliedOutlineId')::uuid;
    select outline.outline_json
    into v_applied_outline_json
    from public.writer_issue_outlines outline
    where outline.issue_id = v_issue_id
      and outline.id = v_applied_outline_id
      and outline.id = (
        select latest.id
        from public.writer_issue_outlines latest
        where latest.issue_id = v_issue_id
        order by latest.version desc
        limit 1
      )
    for update;
    if not found then
      raise exception 'Legacy applied outline is no longer the latest issue outline';
    end if;
  elsif v_snapshot->'appliedOutlineId' <> 'null'::jsonb then
    raise exception 'Snapshot is not an eligible legacy applied snapshot';
  end if;

  select
    count(*),
    count(distinct page.page_number),
    min(page.page_number),
    max(page.page_number)
  into
    v_page_count,
    v_distinct_page_count,
    v_min_page_number,
    v_max_page_number
  from public.writer_pages page
  where page.issue_id = v_issue_id;
  if (v_page_count = 0 and (v_min_page_number is not null or v_max_page_number is not null))
    or (v_page_count > 0 and (
      v_distinct_page_count <> v_page_count
      or v_min_page_number <> 1
      or v_max_page_number <> v_page_count
    ))
  then
    raise exception 'Legacy applied page-number set is not contiguous';
  end if;

  v_normalized_snapshot := v_snapshot || jsonb_build_object(
    'plannedOutlineId', case
      when v_outline_applied then to_jsonb(v_applied_outline_id)
      else 'null'::jsonb
    end,
    'createdPages', '[]'::jsonb,
    'sourcePageCount', v_page_count,
    'targetPageCount', v_page_count,
    'appliedOutlineJson', coalesce(v_applied_outline_json, 'null'::jsonb)
  );

  update public.writer_pacing_revision_sets
  set apply_snapshot = v_normalized_snapshot,
      recovery_status = 'legacy_snapshot_normalized'
  where id = p_set_id
    and status = 'applied';
  if not found then
    raise exception 'Legacy applied Revision Set changed during normalization';
  end if;

  return public.undo_writer_pacing_revision_apply(p_set_id);
end;
$$;

revoke all on function public.undo_legacy_writer_pacing_revision_apply(uuid) from public;
grant execute on function public.undo_legacy_writer_pacing_revision_apply(uuid) to authenticated;
