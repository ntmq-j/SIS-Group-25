-- Phase 6 security hardening: participant identity is immutable.
-- Status transitions are handled by guard_activity_participant_write(), but
-- the row's activity/user identity must never be reassigned by a client.

create or replace function public.prevent_activity_participant_protected_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- The activity-created trigger inserts the creator's auto-accepted row.
    -- It must retain its server-supplied timestamps. For client join requests,
    -- always stamp creation time on the server and clear response metadata so
    -- callers cannot evade the join-request rate limit or forge a response.
    if auth.uid() is not null
       and not (new.is_creator and new.user_id = auth.uid())
    then
      new.created_at := now();
      new.responded_at := null;
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.activity_id is distinct from old.activity_id
     or new.user_id is distinct from old.user_id
     or new.is_creator is distinct from old.is_creator
     or new.created_at is distinct from old.created_at
  then
    raise exception using
      errcode = 'P0001',
      message = '[forbidden] Activity participant identity cannot be changed.';
  end if;

  -- The transition guard sets responded_at itself when a creator accepts or
  -- declines a request. A client must not forge or erase that audit field.
  if auth.uid() is not null
     and new.responded_at is distinct from old.responded_at
  then
    raise exception using
      errcode = 'P0001',
      message = '[forbidden] Participant response metadata cannot be changed.';
  end if;

  return new;
end;
$$;

comment on function public.prevent_activity_participant_protected_changes() is
  'Prevents client updates from reassigning participant identity or response metadata.';

drop trigger if exists on_activity_participant_protected_fields
  on public.activity_participants;
create trigger on_activity_participant_protected_fields
  before insert or update on public.activity_participants
  for each row
  execute function public.prevent_activity_participant_protected_changes();

revoke all on function public.prevent_activity_participant_protected_changes()
from public, anon, authenticated;
