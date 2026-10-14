-- Optional attendee limits and a FIFO waitlist for official events.
-- Unlimited events remain the default; capacity checks and promotion happen
-- inside database triggers so direct API clients cannot bypass them.

alter table public.official_events
  add column if not exists participant_limit integer;

alter table public.official_events
  drop constraint if exists official_events_participant_limit_range;

alter table public.official_events
  add constraint official_events_participant_limit_range
  check (participant_limit is null or participant_limit between 1 and 10000);

comment on column public.official_events.participant_limit is
  'Optional maximum number of going RSVPs. Null means unlimited; values are limited to 1..10000.';

alter table public.event_rsvps
  drop constraint if exists event_rsvps_status_check;

alter table public.event_rsvps
  add constraint event_rsvps_status_check
  check (status in ('going', 'interested', 'waitlisted'));

comment on column public.event_rsvps.status is
  'going, interested, or waitlisted when an optional event capacity has been reached.';

-- Prevent event admins from lowering capacity below the number of confirmed
-- attendees. A null limit means unlimited and is always safe.
create or replace function public.check_official_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_going_count integer;
begin
  if new.participant_limit is not distinct from old.participant_limit
     or new.participant_limit is null then
    return new;
  end if;

  select count(*)::integer
    into v_going_count
  from public.event_rsvps r
  where r.event_id = new.id
    and r.status = 'going';

  if v_going_count > new.participant_limit then
    raise exception using
      errcode = 'P0001',
      message = '[event_capacity] Capacity cannot be lower than the current number of confirmed attendees.';
  end if;

  return new;
end;
$$;

drop trigger if exists on_official_event_capacity_check
  on public.official_events;

create trigger on_official_event_capacity_check
  before update of participant_limit on public.official_events
  for each row
  execute function public.check_official_event_capacity();

-- Serialize all RSVP writes on the parent event row. This prevents two
-- simultaneous requests from both claiming the final seat.
create or replace function public.check_event_rsvp_allowed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_end_time timestamptz;
  v_participant_limit integer;
  v_going_count integer;
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.event_id is distinct from old.event_id
    or new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using
      errcode = 'P0001',
      message = '[forbidden] Protected RSVP fields cannot be changed.';
  end if;

  select e.status, e.end_time, e.participant_limit
    into v_status, v_end_time, v_participant_limit
  from public.official_events e
  where e.id = new.event_id
  for update;

  if not found or v_status <> 'approved' or v_end_time <= now() then
    raise exception using
      errcode = 'P0001',
      message = '[expired] This event is no longer accepting RSVPs.';
  end if;

  if new.status = 'going' and v_participant_limit is not null then
    select count(*)::integer
      into v_going_count
    from public.event_rsvps r
    where r.event_id = new.event_id
      and r.status = 'going'
      and r.id <> new.id;

    if v_going_count >= v_participant_limit then
      new.status := 'waitlisted';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.promote_event_waitlist(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_end_time timestamptz;
  v_participant_limit integer;
  v_going_count integer;
  v_waitlisted_id uuid;
begin
  select e.status, e.end_time, e.participant_limit
    into v_status, v_end_time, v_participant_limit
  from public.official_events e
  where e.id = p_event_id
  for update;

  if not found or v_status <> 'approved' or v_end_time <= now() then
    return;
  end if;

  loop
    select count(*)::integer
      into v_going_count
    from public.event_rsvps r
    where r.event_id = p_event_id
      and r.status = 'going';

    exit when v_participant_limit is not null
      and v_going_count >= v_participant_limit;

    select r.id
      into v_waitlisted_id
    from public.event_rsvps r
    where r.event_id = p_event_id
      and r.status = 'waitlisted'
    order by r.created_at, r.id
    limit 1
    for update skip locked;

    exit when v_waitlisted_id is null;

    update public.event_rsvps
    set status = 'going'
    where id = v_waitlisted_id;

    v_waitlisted_id := null;
  end loop;
end;
$$;

revoke all on function public.promote_event_waitlist(uuid)
  from public, anon, authenticated;

create or replace function public.promote_event_waitlist_after_rsvp_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'going' and new.status <> 'going' then
    perform public.promote_event_waitlist(old.event_id);
  end if;
  return new;
end;
$$;

create or replace function public.promote_event_waitlist_after_rsvp_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'going' then
    perform public.promote_event_waitlist(old.event_id);
  end if;
  return old;
end;
$$;

drop trigger if exists on_event_rsvp_promote_waitlist_after_update
  on public.event_rsvps;
create trigger on_event_rsvp_promote_waitlist_after_update
  after update of status on public.event_rsvps
  for each row
  execute function public.promote_event_waitlist_after_rsvp_change();

drop trigger if exists on_event_rsvp_promote_waitlist_after_delete
  on public.event_rsvps;
create trigger on_event_rsvp_promote_waitlist_after_delete
  after delete on public.event_rsvps
  for each row
  execute function public.promote_event_waitlist_after_rsvp_delete();

-- If an organisation increases capacity, removes the limit, or republishes an
-- event, fill any newly available places from the front of the queue.
create or replace function public.promote_event_waitlist_after_event_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.promote_event_waitlist(new.id);
  return new;
end;
$$;

drop trigger if exists on_official_event_promote_waitlist
  on public.official_events;
create trigger on_official_event_promote_waitlist
  after update of participant_limit, status on public.official_events
  for each row
  execute function public.promote_event_waitlist_after_event_change();
