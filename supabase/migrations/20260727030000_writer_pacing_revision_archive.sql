-- Preserve prior Pacing Revision Sets as owner-scoped, read-only history.

alter table public.writer_pacing_revision_sets
  drop constraint if exists writer_pacing_revision_sets_status_check;

alter table public.writer_pacing_revision_sets
  add constraint writer_pacing_revision_sets_status_check check (
    status in (
      'generating',
      'partially_ready',
      'ready',
      'applying',
      'applied',
      'failed',
      'archived',
      'discarded'
    )
  );

create or replace function public.archive_writer_pacing_revision_set(
  p_set_id uuid,
  p_expected_status text,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_affected_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if p_expected_status not in ('ready', 'partially_ready', 'applied', 'failed')
    or p_expected_updated_at is null
  then
    return false;
  end if;

  perform 1
  from public.writer_pacing_revision_sets revision_set
  join public.writer_issues issue on issue.id = revision_set.issue_id
  join public.writer_series series on series.id = issue.series_id
  where revision_set.id = p_set_id
    and revision_set.status in ('ready', 'partially_ready', 'applied', 'failed')
    and revision_set.status = p_expected_status
    and revision_set.updated_at = p_expected_updated_at
    and series.owner_id = auth.uid()
  for update of revision_set;

  if not found then
    return false;
  end if;

  update public.writer_pacing_revision_sets revision_set
  set status = 'archived'
  where revision_set.id = p_set_id
    and revision_set.status = p_expected_status
    and revision_set.updated_at = p_expected_updated_at;

  get diagnostics v_affected_count = row_count;
  if v_affected_count <> 1 then
    raise exception 'Archive did not update exactly one Revision Set';
  end if;

  return true;
end;
$$;

revoke all on function public.archive_writer_pacing_revision_set(uuid, text, timestamptz) from public;
grant execute on function public.archive_writer_pacing_revision_set(uuid, text, timestamptz) to authenticated;
