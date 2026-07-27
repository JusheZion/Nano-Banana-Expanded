-- Atomically close and reopen Pacing Revision Apply so set and child states
-- cannot diverge if the client disconnects between table updates.

create or replace function public.complete_writer_pacing_revision_apply(
  p_set_id uuid,
  p_change_ids uuid[],
  p_snapshot jsonb
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
    and revision_set.status = 'applying'
    and series.owner_id = auth.uid()
  for update of revision_set;
  if not found then
    raise exception 'Applying Revision Set was not found for the authenticated owner';
  end if;

  update public.writer_pacing_revision_changes change
  set generation_status = 'applied',
      applied_at = now()
  from public.writer_pacing_revision_items item
  where change.item_id = item.id
    and item.revision_set_id = p_set_id
    and change.id = any(p_change_ids)
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

revoke all on function public.complete_writer_pacing_revision_apply(uuid, uuid[], jsonb) from public;
revoke all on function public.reopen_writer_pacing_revision_after_undo(uuid, uuid[]) from public;
grant execute on function public.complete_writer_pacing_revision_apply(uuid, uuid[], jsonb) to authenticated;
grant execute on function public.reopen_writer_pacing_revision_after_undo(uuid, uuid[]) to authenticated;
