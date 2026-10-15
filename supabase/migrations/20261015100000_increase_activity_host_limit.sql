-- Allow each verified user to host up to ten open activities at once.
-- This updates the database guard so the limit applies to both Edge Function
-- and direct RLS-protected PostgREST inserts.

create or replace function public.guard_activity_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open_count int;
begin
  if tg_op = 'INSERT' then
    if new.end_time <= now() then
      raise exception using
        errcode = 'P0001',
        message = '[invalid_time_window] An activity cannot start or end in the past.';
    end if;

    -- Serialize each creator's inserts so concurrent requests cannot race
    -- past the open-activity limit.
    perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text, 0));

    -- Limit each creator to ten open activities that have not expired.
    select count(*) into v_open_count
    from public.activities a
    where a.creator_id = new.creator_id
      and a.status = 'open'
      and a.end_time > now();

    if v_open_count >= 10 then
      raise exception using
        errcode = 'P0001',
        message = '[rate_limited] You already have 10 open activities. Cancel or wait for one to finish before creating another.';
    end if;

    return new;
  end if;

  -- UPDATE from here.

  if new.id is distinct from old.id
    or new.creator_id is distinct from old.creator_id
    or new.created_at is distinct from old.created_at
  then
    raise exception using
      errcode = 'P0001',
      message = '[forbidden] Protected activity fields cannot be changed.';
  end if;

  if old.status = 'cancelled' and new.status = 'cancelled' then
    raise exception using
      errcode = 'P0001',
      message = '[activity_cancelled] This activity has been cancelled and can no longer be edited.';
  end if;

  if old.end_time <= now() and new.status <> 'cancelled' then
    raise exception using
      errcode = 'P0001',
      message = '[expired] This activity has already ended and can no longer be edited.';
  end if;

  if new.participant_limit < old.participant_limit
     and new.participant_limit < public.activity_accepted_count(new.id)
  then
    raise exception using
      errcode = 'P0001',
      message = '[activity_full] participant_limit cannot be set below the number of already-accepted participants.';
  end if;

  if new.end_time <= new.start_time then
    raise exception using
      errcode = 'P0001',
      message = '[invalid_time_window] end_time must be after start_time.';
  end if;

  return new;
end;
$$;

comment on function public.guard_activity_write() is
  'Time-window validity, ten-open-activities-per-creator limit, and edit rules on activities.';
