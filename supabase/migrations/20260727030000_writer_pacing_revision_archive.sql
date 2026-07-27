-- Preserve prior Pacing Revision Sets as owner-scoped, read-only history.

alter table public.writer_pacing_revision_sets
  add column if not exists archived_from_status text,
  add column if not exists archived_at timestamptz,
  add column if not exists generation_lease_id uuid,
  add column if not exists generation_lease_previous_status text,
  add column if not exists generation_lease_expires_at timestamptz;

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

alter table public.writer_pacing_revision_sets
  drop constraint if exists writer_pacing_revision_sets_archive_metadata_check;

alter table public.writer_pacing_revision_sets
  add constraint writer_pacing_revision_sets_archive_metadata_check check (
    (
      status = 'archived'
      and archived_from_status in ('ready', 'partially_ready', 'applied', 'failed')
      and archived_at is not null
    )
    or
    (
      status <> 'archived'
      and archived_from_status is null
      and archived_at is null
    )
  );

alter table public.writer_pacing_revision_sets
  drop constraint if exists writer_pacing_revision_sets_generation_lease_check;

alter table public.writer_pacing_revision_sets
  add constraint writer_pacing_revision_sets_generation_lease_check check (
    (
      generation_lease_id is null
      and generation_lease_previous_status is null
      and generation_lease_expires_at is null
    )
    or
    (
      status = 'generating'
      and generation_lease_id is not null
      and generation_lease_previous_status in ('ready', 'partially_ready', 'failed')
      and generation_lease_expires_at is not null
    )
  );

create or replace function public.set_writer_pacing_revision_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create or replace function public.guard_archived_pacing_revision_set_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'archived' then
      raise exception 'Archived Pacing Revision Sets may only be created through the archive transaction';
    end if;
    return new;
  end if;

  if old.status = 'archived' then
    raise exception 'Archived Pacing Revision Sets are read-only';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.status = 'generating' and new.generation_lease_id is not null
    and (
      old.status is distinct from new.status
      or old.generation_lease_id is distinct from new.generation_lease_id
    )
    and current_setting('app.pacing_revision_generation_acquire_lease_id', true)
      is distinct from new.generation_lease_id::text
  then
    raise exception 'Use the guarded generation lease transaction to start page preview';
  end if;

  if old.status = 'generating' and old.generation_lease_id is not null
    and (
      new.status is distinct from old.status
      or new.generation_lease_id is distinct from old.generation_lease_id
    )
    and current_setting('app.pacing_revision_generation_release_lease_id', true)
      is distinct from old.generation_lease_id::text
  then
    raise exception 'Use the guarded generation lease transaction to finish page preview';
  end if;

  if new.status = 'archived' then
    if current_setting('app.pacing_revision_archive_set_id', true) is distinct from old.id::text
      or old.status not in ('ready', 'partially_ready', 'applied', 'failed')
      or new.archived_from_status is distinct from old.status
      or new.archived_at is null
    then
      raise exception 'Use the guarded archive transaction to archive a Pacing Revision Set';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.guard_archived_pacing_revision_item_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revision_set_status text;
begin
  if tg_op <> 'INSERT' then
    select revision_set.status
    into v_revision_set_status
    from public.writer_pacing_revision_sets revision_set
    where revision_set.id = old.revision_set_id
    for update;
    if v_revision_set_status = 'archived' then
      raise exception 'Archived Pacing Revision Items are read-only';
    end if;
  end if;

  if tg_op <> 'DELETE' then
    v_revision_set_status := null;
    select revision_set.status
    into v_revision_set_status
    from public.writer_pacing_revision_sets revision_set
    where revision_set.id = new.revision_set_id
    for update;
    if v_revision_set_status = 'archived' then
      raise exception 'Archived Pacing Revision Items are read-only';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.guard_archived_pacing_revision_change_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revision_set_status text;
begin
  if tg_op <> 'INSERT' then
    select revision_set.status
    into v_revision_set_status
    from public.writer_pacing_revision_items item
    join public.writer_pacing_revision_sets revision_set
      on revision_set.id = item.revision_set_id
    where item.id = old.item_id
    for update of revision_set;
    if v_revision_set_status = 'archived' then
      raise exception 'Archived Pacing Revision Changes are read-only';
    end if;
  end if;

  if tg_op <> 'DELETE' then
    v_revision_set_status := null;
    select revision_set.status
    into v_revision_set_status
    from public.writer_pacing_revision_items item
    join public.writer_pacing_revision_sets revision_set
      on revision_set.id = item.revision_set_id
    where item.id = new.item_id
    for update of revision_set;
    if v_revision_set_status = 'archived' then
      raise exception 'Archived Pacing Revision Changes are read-only';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists writer_pacing_revision_sets_archive_guard
  on public.writer_pacing_revision_sets;
create trigger writer_pacing_revision_sets_archive_guard
before insert or update or delete on public.writer_pacing_revision_sets
for each row execute function public.guard_archived_pacing_revision_set_mutation();

drop trigger if exists writer_pacing_revision_items_archive_guard
  on public.writer_pacing_revision_items;
create trigger writer_pacing_revision_items_archive_guard
before insert or update or delete on public.writer_pacing_revision_items
for each row execute function public.guard_archived_pacing_revision_item_mutation();

drop trigger if exists writer_pacing_revision_changes_archive_guard
  on public.writer_pacing_revision_changes;
create trigger writer_pacing_revision_changes_archive_guard
before insert or update or delete on public.writer_pacing_revision_changes
for each row execute function public.guard_archived_pacing_revision_change_mutation();

create or replace function public.touch_writer_pacing_revision_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_revision_set_id uuid;
  v_new_revision_set_id uuid;
begin
  if tg_table_name = 'writer_pacing_revision_items' then
    if tg_op <> 'INSERT' then
      v_old_revision_set_id := old.revision_set_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_revision_set_id := new.revision_set_id;
    end if;
  else
    if tg_op <> 'INSERT' then
      select item.revision_set_id
      into v_old_revision_set_id
      from public.writer_pacing_revision_items item
      where item.id = old.item_id;
    end if;
    if tg_op <> 'DELETE' then
      select item.revision_set_id
      into v_new_revision_set_id
      from public.writer_pacing_revision_items item
      where item.id = new.item_id;
    end if;
  end if;

  if v_old_revision_set_id is not null then
    update public.writer_pacing_revision_sets
    set updated_at = clock_timestamp()
    where id = v_old_revision_set_id;
  end if;

  if v_new_revision_set_id is not null
    and v_new_revision_set_id is distinct from v_old_revision_set_id
  then
    update public.writer_pacing_revision_sets
    set updated_at = clock_timestamp()
    where id = v_new_revision_set_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists writer_pacing_revision_items_touch_parent
  on public.writer_pacing_revision_items;
create trigger writer_pacing_revision_items_touch_parent
after insert or update or delete on public.writer_pacing_revision_items
for each row execute function public.touch_writer_pacing_revision_parent();

drop trigger if exists writer_pacing_revision_changes_touch_parent
  on public.writer_pacing_revision_changes;
create trigger writer_pacing_revision_changes_touch_parent
after insert or update or delete on public.writer_pacing_revision_changes
for each row execute function public.touch_writer_pacing_revision_parent();

create or replace function public.acquire_writer_pacing_revision_generation_lease(
  p_set_id uuid,
  p_expected_status text,
  p_expected_updated_at timestamptz,
  p_lease_id uuid
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

  if p_expected_status not in ('ready', 'partially_ready', 'failed')
    or p_expected_updated_at is null
    or p_lease_id is null
  then
    return false;
  end if;

  perform 1
  from public.writer_pacing_revision_sets revision_set
  join public.writer_issues issue on issue.id = revision_set.issue_id
  join public.writer_series series on series.id = issue.series_id
  where revision_set.id = p_set_id
    and revision_set.status = p_expected_status
    and revision_set.updated_at = p_expected_updated_at
    and revision_set.generation_lease_id is null
    and series.owner_id = auth.uid()
  for update of revision_set;

  if not found then
    return false;
  end if;

  perform set_config(
    'app.pacing_revision_generation_acquire_lease_id',
    p_lease_id::text,
    true
  );

  update public.writer_pacing_revision_sets revision_set
  set status = 'generating',
      generation_lease_id = p_lease_id,
      generation_lease_previous_status = p_expected_status,
      generation_lease_expires_at = clock_timestamp() + interval '2 minutes'
  where revision_set.id = p_set_id
    and revision_set.status = p_expected_status
    and revision_set.updated_at = p_expected_updated_at
    and revision_set.generation_lease_id is null;

  get diagnostics v_affected_count = row_count;
  return v_affected_count = 1;
end;
$$;

create or replace function public.release_writer_pacing_revision_generation_lease(
  p_set_id uuid,
  p_lease_id uuid,
  p_final_status text,
  p_progress_json jsonb default null,
  p_failure_ledger jsonb default null
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

  if p_lease_id is null
    or p_final_status not in ('ready', 'partially_ready', 'failed')
  then
    return false;
  end if;

  perform 1
  from public.writer_pacing_revision_sets revision_set
  join public.writer_issues issue on issue.id = revision_set.issue_id
  join public.writer_series series on series.id = issue.series_id
  where revision_set.id = p_set_id
    and revision_set.status = 'generating'
    and revision_set.generation_lease_id = p_lease_id
    and series.owner_id = auth.uid()
  for update of revision_set;

  if not found then
    return false;
  end if;

  perform set_config(
    'app.pacing_revision_generation_release_lease_id',
    p_lease_id::text,
    true
  );

  update public.writer_pacing_revision_sets revision_set
  set status = p_final_status,
      generation_lease_id = null,
      generation_lease_previous_status = null,
      generation_lease_expires_at = null,
      progress_json = coalesce(p_progress_json, revision_set.progress_json),
      failure_ledger = coalesce(p_failure_ledger, revision_set.failure_ledger)
  where revision_set.id = p_set_id
    and revision_set.status = 'generating'
    and revision_set.generation_lease_id = p_lease_id;

  get diagnostics v_affected_count = row_count;
  return v_affected_count = 1;
end;
$$;

create or replace function public.recover_stale_writer_pacing_revision_generation_lease(
  p_set_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lease_id uuid;
  v_previous_status text;
  v_affected_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select revision_set.generation_lease_id,
         revision_set.generation_lease_previous_status
  into v_lease_id, v_previous_status
  from public.writer_pacing_revision_sets revision_set
  join public.writer_issues issue on issue.id = revision_set.issue_id
  join public.writer_series series on series.id = issue.series_id
  where revision_set.id = p_set_id
    and revision_set.status = 'generating'
    and revision_set.generation_lease_id is not null
    and revision_set.generation_lease_expires_at < clock_timestamp()
    and series.owner_id = auth.uid()
  for update of revision_set;

  if not found then
    return false;
  end if;

  perform set_config(
    'app.pacing_revision_generation_release_lease_id',
    v_lease_id::text,
    true
  );

  update public.writer_pacing_revision_sets revision_set
  set status = case
        when v_previous_status in ('ready', 'partially_ready', 'failed')
          then v_previous_status
        else 'partially_ready'
      end,
      generation_lease_id = null,
      generation_lease_previous_status = null,
      generation_lease_expires_at = null
  where revision_set.id = p_set_id
    and revision_set.status = 'generating'
    and revision_set.generation_lease_id = v_lease_id;

  get diagnostics v_affected_count = row_count;
  return v_affected_count = 1;
end;
$$;

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

  perform set_config('app.pacing_revision_archive_set_id', p_set_id::text, true);

  update public.writer_pacing_revision_sets revision_set
  set archived_from_status = revision_set.status,
      archived_at = now(),
      status = 'archived'
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
revoke all on function public.acquire_writer_pacing_revision_generation_lease(uuid, text, timestamptz, uuid) from public;
grant execute on function public.acquire_writer_pacing_revision_generation_lease(uuid, text, timestamptz, uuid) to authenticated;
revoke all on function public.release_writer_pacing_revision_generation_lease(uuid, uuid, text, jsonb, jsonb) from public;
grant execute on function public.release_writer_pacing_revision_generation_lease(uuid, uuid, text, jsonb, jsonb) to authenticated;
revoke all on function public.recover_stale_writer_pacing_revision_generation_lease(uuid) from public;
grant execute on function public.recover_stale_writer_pacing_revision_generation_lease(uuid) to authenticated;
revoke all on function public.guard_archived_pacing_revision_set_mutation() from public;
revoke all on function public.guard_archived_pacing_revision_item_mutation() from public;
revoke all on function public.guard_archived_pacing_revision_change_mutation() from public;
revoke all on function public.touch_writer_pacing_revision_parent() from public;
