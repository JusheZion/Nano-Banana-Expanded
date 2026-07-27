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
  v_distinct_page_count integer;
  v_min_page_number integer;
  v_max_page_number integer;
  v_page_expectation jsonb;
  v_distinct_page_count integer;
  v_min_page_number integer;
  v_max_page_number integer;
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
      and (
        (p_snapshot->>'appliedOutlineId')::uuid
          <> (p_expectation->>'outline_id')::uuid
        or p_snapshot->'appliedOutlineJson'
          is distinct from p_expectation->'outline_json'
      )
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

  select
    count(*),
    count(distinct page.page_number),
    min(page.page_number),
    max(page.page_number)
  into
    v_affected_count,
    v_distinct_page_count,
    v_min_page_number,
    v_max_page_number
  from public.writer_pages page
  where page.issue_id = v_issue_id;
  if (
    (p_expectation->>'target_page_count')::integer = 0
    and v_affected_count <> 0
  ) or (
    (p_expectation->>'target_page_count')::integer > 0
    and (
      v_affected_count <> (p_expectation->>'target_page_count')::integer
      or v_distinct_page_count <> (p_expectation->>'target_page_count')::integer
      or v_min_page_number <> 1
      or v_max_page_number <> (p_expectation->>'target_page_count')::integer
      or exists (
        select 1
        from generate_series(
          1,
          (p_expectation->>'target_page_count')::integer
        ) expected_number
        where not exists (
          select 1
          from public.writer_pages page
          where page.issue_id = v_issue_id
            and page.page_number = expected_number
        )
      )
      or exists (
        select 1
        from public.writer_pages page
        where page.issue_id = v_issue_id
          and (
            page.page_number < 1
            or page.page_number > (p_expectation->>'target_page_count')::integer
          )
      )
    )
  ) then
    raise exception 'Target page-number set changed before completion';
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

create or replace function public.undo_writer_pacing_revision_apply(
  p_set_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_failure_ledger jsonb;
  v_issue_id uuid;
  v_expected_count integer;
  v_affected_count integer;
  v_reopen_status text;
  v_entry jsonb;
  v_outline_applied boolean;
  v_latest_outline_id uuid;
  v_latest_outline_json jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select
    revision_set.issue_id,
    revision_set.apply_snapshot,
    revision_set.failure_ledger
  into
    v_issue_id,
    v_snapshot,
    v_failure_ledger
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

  perform 1
  from public.writer_issues issue
  where issue.id = v_issue_id
  for update;

  lock table
    public.writer_pacing_revision_items,
    public.writer_pacing_revision_changes
  in share row exclusive mode;
  perform 1
  from public.writer_pacing_revision_items item
  join public.writer_pacing_revision_changes change on change.item_id = item.id
  where item.revision_set_id = p_set_id
  for update of item, change;

  if v_snapshot is null
    or jsonb_typeof(v_snapshot) <> 'object'
    or jsonb_typeof(v_snapshot->'appliedIds') <> 'array'
    or jsonb_typeof(v_snapshot->'beats') <> 'array'
    or jsonb_typeof(v_snapshot->'dialogue') <> 'array'
    or jsonb_typeof(v_snapshot->'createdPages') <> 'array'
    or jsonb_typeof(v_snapshot->'sourcePageCount') <> 'number'
    or jsonb_typeof(v_snapshot->'targetPageCount') <> 'number'
    or jsonb_typeof(v_snapshot->'outlineApplied') <> 'boolean'
    or not (v_snapshot ? 'plannedOutlineId')
    or not (v_snapshot ? 'appliedOutlineId')
    or not (v_snapshot ? 'appliedOutlineJson')
  then
    raise exception 'Applied recovery snapshot is invalid';
  end if;

  v_outline_applied := (v_snapshot->>'outlineApplied')::boolean;
  v_expected_count := jsonb_array_length(v_snapshot->'appliedIds');
  if v_expected_count = 0
    or v_expected_count <> (
      select count(distinct applied_id)
      from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
    )
    or (v_snapshot->>'sourcePageCount')::integer < 0
    or (v_snapshot->>'targetPageCount')::integer < (v_snapshot->>'sourcePageCount')::integer
    or exists (
      select 1
      from jsonb_array_elements(v_snapshot->'createdPages') created_page
      where jsonb_typeof(created_page) <> 'object'
        or jsonb_typeof(created_page->'pageId') <> 'string'
        or jsonb_typeof(created_page->'pageNumber') <> 'number'
        or (created_page->>'pageNumber')::integer <= (v_snapshot->>'sourcePageCount')::integer
        or (created_page->>'pageNumber')::integer > (v_snapshot->>'targetPageCount')::integer
    )
    or jsonb_array_length(v_snapshot->'createdPages') <> (
      select count(distinct created_page->>'pageId')
      from jsonb_array_elements(v_snapshot->'createdPages') created_page
    )
    or jsonb_array_length(v_snapshot->'createdPages') <> (
      select count(distinct created_page->>'pageNumber')
      from jsonb_array_elements(v_snapshot->'createdPages') created_page
    )
    or jsonb_array_length(v_snapshot->'createdPages')
      <> (v_snapshot->>'targetPageCount')::integer - (v_snapshot->>'sourcePageCount')::integer
    or exists (
      select 1
      from generate_series(
        (v_snapshot->>'sourcePageCount')::integer + 1,
        (v_snapshot->>'targetPageCount')::integer
      ) expected_number
      where not exists (
        select 1
        from jsonb_array_elements(v_snapshot->'createdPages') created_page
        where (created_page->>'pageNumber')::integer = expected_number
      )
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
    raise exception 'Applied recovery snapshot is invalid';
  end if;

  if (
    select count(*)
    from public.writer_pacing_revision_changes change
    join public.writer_pacing_revision_items item on item.id = change.item_id
    where item.revision_set_id = p_set_id
      and change.id in (
        select applied_id::uuid
        from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
      )
      and change.decision = 'approved'
      and change.generation_status = 'applied'
  ) <> v_expected_count
    or (
      select count(*)
      from public.writer_pacing_revision_changes change
      join public.writer_pacing_revision_items item on item.id = change.item_id
      where item.revision_set_id = p_set_id
        and change.generation_status = 'applied'
    ) <> v_expected_count
  then
    raise exception 'Applied recovery snapshot does not match the applied changes';
  end if;

  if jsonb_array_length(v_snapshot->'beats') <> (
    select count(*)
    from public.writer_pacing_revision_changes change
    join public.writer_pacing_revision_items item on item.id = change.item_id
    where item.revision_set_id = p_set_id
      and change.id in (
        select applied_id::uuid
        from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
      )
      and change.layer = 'beats'
      and change.page_id is not null
  ) or jsonb_array_length(v_snapshot->'dialogue') <> (
    select count(*)
    from public.writer_pacing_revision_changes change
    join public.writer_pacing_revision_items item on item.id = change.item_id
    where item.revision_set_id = p_set_id
      and change.id in (
        select applied_id::uuid
        from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
      )
      and change.layer = 'dialogue'
      and change.page_id is not null
  ) or exists (
    select 1
    from jsonb_array_elements(v_snapshot->'createdPages') created_page
    where (
      select count(*)
      from public.writer_pacing_revision_changes change
      join public.writer_pacing_revision_items item on item.id = change.item_id
      where item.revision_set_id = p_set_id
        and change.id in (
          select applied_id::uuid
          from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
        )
        and change.page_id is null
        and change.page_number = (created_page->>'pageNumber')::integer
        and change.layer = 'beats'
    ) <> 1
      or (
        select count(*)
        from public.writer_pacing_revision_changes change
        join public.writer_pacing_revision_items item on item.id = change.item_id
        where item.revision_set_id = p_set_id
          and change.id in (
            select applied_id::uuid
            from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
          )
          and change.page_id is null
          and change.page_number = (created_page->>'pageNumber')::integer
          and change.layer = 'dialogue'
      ) <> 1
  ) then
    raise exception 'Applied recovery snapshot does not match exact page-layer ownership';
  end if;

  if exists (
    select 1
    from public.writer_pacing_revision_changes change
    join public.writer_pacing_revision_items item on item.id = change.item_id
    where item.revision_set_id = p_set_id
      and change.id in (
        select applied_id::uuid
        from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
      )
      and change.layer = 'beats'
      and change.page_id is not null
      and not exists (
        select 1
        from jsonb_array_elements(v_snapshot->'beats') prior
        where (prior->>'pageId')::uuid = change.page_id
          and prior->'value' is not distinct from change.current_value
      )
  ) or exists (
    select 1
    from public.writer_pacing_revision_changes change
    join public.writer_pacing_revision_items item on item.id = change.item_id
    where item.revision_set_id = p_set_id
      and change.id in (
        select applied_id::uuid
        from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
      )
      and change.layer = 'dialogue'
      and change.page_id is not null
      and not exists (
        select 1
        from jsonb_array_elements(v_snapshot->'dialogue') prior
        where (prior->>'pageId')::uuid = change.page_id
          and prior->'value' is not distinct from change.current_value
      )
  ) then
    raise exception 'Applied recovery snapshot does not match prior page content';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_snapshot->'beats') prior
    where not exists (
      select 1
      from public.writer_pacing_revision_changes change
      join public.writer_pacing_revision_items item on item.id = change.item_id
      where item.revision_set_id = p_set_id
        and change.id in (
          select applied_id::uuid
          from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
        )
        and change.layer = 'beats'
        and change.page_id = (prior->>'pageId')::uuid
        and change.current_value is not distinct from prior->'value'
    )
  ) or exists (
    select 1
    from jsonb_array_elements(v_snapshot->'dialogue') prior
    where not exists (
      select 1
      from public.writer_pacing_revision_changes change
      join public.writer_pacing_revision_items item on item.id = change.item_id
      where item.revision_set_id = p_set_id
        and change.id in (
          select applied_id::uuid
          from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
        )
        and change.layer = 'dialogue'
        and change.page_id = (prior->>'pageId')::uuid
        and change.current_value is not distinct from prior->'value'
    )
  ) then
    raise exception 'Applied recovery snapshot contains unauthorized prior page content';
  end if;

  if v_outline_applied <> exists (
    select 1
    from public.writer_pacing_revision_changes change
    join public.writer_pacing_revision_items item on item.id = change.item_id
    where item.revision_set_id = p_set_id
      and change.id in (
        select applied_id::uuid
        from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
      )
      and change.layer = 'outline'
  ) or (
    v_outline_applied and (
      jsonb_typeof(v_snapshot->'plannedOutlineId') <> 'string'
      or jsonb_typeof(v_snapshot->'appliedOutlineId') <> 'string'
      or jsonb_typeof(v_snapshot->'appliedOutlineJson') <> 'object'
      or (v_snapshot->>'plannedOutlineId')::uuid <> (v_snapshot->>'appliedOutlineId')::uuid
    )
  ) or (
    not v_outline_applied and (
      v_snapshot->'plannedOutlineId' <> 'null'::jsonb
      or v_snapshot->'appliedOutlineId' <> 'null'::jsonb
      or v_snapshot->'appliedOutlineJson' <> 'null'::jsonb
    )
  ) then
    raise exception 'Applied recovery snapshot has invalid outline authority';
  end if;

  -- Lock the complete live-content scope. Any concurrent edit either commits
  -- first and fails validation below, or waits until this Undo commits.
  lock table public.writer_pages, public.writer_issue_outlines in share row exclusive mode;
  perform 1
  from public.writer_pages page
  where page.issue_id = v_issue_id
  for update;

  select
    count(*),
    count(distinct page.page_number),
    min(page.page_number),
    max(page.page_number)
  into
    v_affected_count,
    v_distinct_page_count,
    v_min_page_number,
    v_max_page_number
  from public.writer_pages page
  where page.issue_id = v_issue_id;
  if (
    (v_snapshot->>'targetPageCount')::integer = 0
    and v_affected_count <> 0
  ) or (
    (v_snapshot->>'targetPageCount')::integer > 0
    and (
      v_affected_count <> (v_snapshot->>'targetPageCount')::integer
      or v_distinct_page_count <> (v_snapshot->>'targetPageCount')::integer
      or v_min_page_number <> 1
      or v_max_page_number <> (v_snapshot->>'targetPageCount')::integer
    )
  ) then
    raise exception 'Target page-number set changed before Undo';
  end if;

  if exists (
    select 1
    from public.writer_pacing_revision_changes change
    join public.writer_pacing_revision_items item on item.id = change.item_id
    where item.revision_set_id = p_set_id
      and change.id in (
        select applied_id::uuid
        from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
      )
      and change.layer in ('beats', 'dialogue')
      and not exists (
        select 1
        from public.writer_pages page
        where page.issue_id = v_issue_id
          and page.id = coalesce(
            change.page_id,
            (
              select (created_page->>'pageId')::uuid
              from jsonb_array_elements(v_snapshot->'createdPages') created_page
              where (created_page->>'pageNumber')::integer = change.page_number
            )
          )
          and (
            change.layer <> 'beats'
            or page.beats_json is not distinct from coalesce(change.edited_candidate, change.ai_proposal)
          )
          and (
            change.layer <> 'dialogue'
            or coalesce(to_jsonb(page.script_text), 'null'::jsonb)
              is not distinct from coalesce(change.edited_candidate, change.ai_proposal)
          )
      )
  ) then
    raise exception 'Applied page content changed before Undo';
  end if;

  select outline.id, outline.outline_json
  into v_latest_outline_id, v_latest_outline_json
  from public.writer_issue_outlines outline
  where outline.issue_id = v_issue_id
  order by outline.version desc
  limit 1
  for update;
  if v_outline_applied and (
    v_latest_outline_id is distinct from (v_snapshot->>'appliedOutlineId')::uuid
    or v_latest_outline_json is distinct from v_snapshot->'appliedOutlineJson'
  ) then
    raise exception 'Applied outline changed before Undo';
  end if;

  -- Every statement below belongs to this RPC transaction. Any exception,
  -- including one after an earlier restore, rolls the complete Undo back.
  for v_entry in select value from jsonb_array_elements(v_snapshot->'beats')
  loop
    update public.writer_pages page
    set beats_json = case
      when v_entry->'value' = 'null'::jsonb then null
      else v_entry->'value'
    end
    where page.issue_id = v_issue_id
      and page.id = (v_entry->>'pageId')::uuid;
    get diagnostics v_affected_count = row_count;
    if v_affected_count <> 1 then
      raise exception 'Undo restoration verification failed';
    end if;
  end loop;

  for v_entry in select value from jsonb_array_elements(v_snapshot->'dialogue')
  loop
    update public.writer_pages page
    set script_text = case
      when v_entry->'value' = 'null'::jsonb then null
      else v_entry->>'value'
    end
    where page.issue_id = v_issue_id
      and page.id = (v_entry->>'pageId')::uuid;
    get diagnostics v_affected_count = row_count;
    if v_affected_count <> 1 then
      raise exception 'Undo restoration verification failed';
    end if;
  end loop;

  delete from public.writer_pages page
  where page.issue_id = v_issue_id
    and page.id in (
      select (created_page->>'pageId')::uuid
      from jsonb_array_elements(v_snapshot->'createdPages') created_page
    );
  get diagnostics v_affected_count = row_count;
  if v_affected_count <> jsonb_array_length(v_snapshot->'createdPages') then
    raise exception 'Undo did not delete every planned created page';
  end if;

  if v_outline_applied then
    delete from public.writer_issue_outlines outline
    where outline.issue_id = v_issue_id
      and outline.id = (v_snapshot->>'appliedOutlineId')::uuid;
    get diagnostics v_affected_count = row_count;
    if v_affected_count <> 1 then
      raise exception 'Undo did not delete the applied outline';
    end if;
  end if;

  v_reopen_status := case
    when jsonb_array_length(coalesce(v_failure_ledger, '[]'::jsonb)) > 0
      or exists (
        select 1
        from public.writer_pacing_revision_changes change
        join public.writer_pacing_revision_items item on item.id = change.item_id
        where item.revision_set_id = p_set_id
          and change.generation_status not in ('ready', 'applied')
      )
    then 'partially_ready'
    else 'ready'
  end;

  update public.writer_pacing_revision_changes change
  set generation_status = 'ready',
      applied_at = null
  from public.writer_pacing_revision_items item
  where change.item_id = item.id
    and item.revision_set_id = p_set_id
    and change.id in (
      select applied_id::uuid
      from jsonb_array_elements_text(v_snapshot->'appliedIds') requested(applied_id)
    )
    and change.generation_status = 'applied';
  get diagnostics v_affected_count = row_count;
  if v_affected_count <> v_expected_count then
    raise exception 'Undo did not update every requested applied change';
  end if;

  update public.writer_pacing_revision_sets
  set status = v_reopen_status,
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

drop function if exists public.reopen_writer_pacing_revision_after_undo(uuid, uuid[]);

revoke all on function public.complete_writer_pacing_revision_apply(uuid, uuid[], jsonb, jsonb) from public;
revoke all on function public.undo_writer_pacing_revision_apply(uuid) from public;
grant execute on function public.complete_writer_pacing_revision_apply(uuid, uuid[], jsonb, jsonb) to authenticated;
grant execute on function public.undo_writer_pacing_revision_apply(uuid) to authenticated;
