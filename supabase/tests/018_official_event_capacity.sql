begin;
select plan(11);

select has_column(
  'public', 'official_events', 'participant_limit',
  'official events support an optional attendee limit'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.official_events'::regclass
      and conname = 'official_events_participant_limit_range'
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%participant_limit%'
      and pg_get_constraintdef(oid) like '%1%'
      and pg_get_constraintdef(oid) like '%10000%'
  ),
  'attendee limit is null or between 1 and 10,000'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.event_rsvps'::regclass
      and conname = 'event_rsvps_status_check'
      and pg_get_constraintdef(oid) like '%waitlisted%'
  ),
  'RSVP status includes waitlisted'
);

select has_function(
  'public', 'promote_event_waitlist', array['uuid'],
  'waitlist promotion helper exists'
);

select ok(
  not has_function_privilege('authenticated', 'public.promote_event_waitlist(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.promote_event_waitlist(uuid)', 'execute'),
  'waitlist promotion helper is not callable through the API'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.event_rsvps'::regclass
      and tgname = 'on_event_rsvp_promote_waitlist_after_delete'
      and not tgisinternal
  ),
  'freeing a confirmed RSVP triggers waitlist promotion'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.official_events'::regclass
      and tgname = 'on_official_event_promote_waitlist'
      and not tgisinternal
  ),
  'new seats or republished events promote waitlisted attendees'
);

create or replace function pg_temp.create_capacity_test_user(p_email text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, crypt('Test-Password1', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Capacity Test","terms_accepted":true,"privacy_accepted":true}'::jsonb,
    now(), now(), '', ''
  );
  return v_id;
end;
$$;

select pg_temp.create_capacity_test_user('capacity.one@student.uts.edu.au') as capacity_one_id \gset
select pg_temp.create_capacity_test_user('capacity.two@student.uts.edu.au') as capacity_two_id \gset

insert into public.official_events (
  organisation_id, location_id, title, start_time, end_time, status, participant_limit
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'Capacity waitlist test', now() + interval '1 hour', now() + interval '2 hours', 'approved', 1
)
returning id as capacity_event_id \gset

insert into public.event_rsvps (event_id, user_id, status)
values (:'capacity_event_id'::uuid, :'capacity_one_id'::uuid, 'going');

insert into public.event_rsvps (event_id, user_id, status)
values (:'capacity_event_id'::uuid, :'capacity_two_id'::uuid, 'going');

select is(
  (select status from public.event_rsvps where event_id = :'capacity_event_id'::uuid and user_id = :'capacity_one_id'::uuid),
  'going',
  'the first RSVP gets the available seat'
);

select is(
  (select status from public.event_rsvps where event_id = :'capacity_event_id'::uuid and user_id = :'capacity_two_id'::uuid),
  'waitlisted',
  'an RSVP beyond capacity is placed on the waitlist'
);

delete from public.event_rsvps
where event_id = :'capacity_event_id'::uuid
  and user_id = :'capacity_one_id'::uuid;

select is(
  (select status from public.event_rsvps where event_id = :'capacity_event_id'::uuid and user_id = :'capacity_two_id'::uuid),
  'going',
  'the oldest waitlisted attendee is promoted when a seat opens'
);

insert into public.event_rsvps (event_id, user_id, status)
values (:'capacity_event_id'::uuid, :'capacity_one_id'::uuid, 'going');

update public.event_rsvps
set status = 'interested'
where event_id = :'capacity_event_id'::uuid
  and user_id = :'capacity_two_id'::uuid;

select is(
  (select status from public.event_rsvps where event_id = :'capacity_event_id'::uuid and user_id = :'capacity_one_id'::uuid),
  'going',
  'changing a confirmed RSVP promotes the oldest waitlisted attendee'
);

select * from finish();
rollback;
