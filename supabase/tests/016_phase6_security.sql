-- Phase 6: security, privacy and deployment-readiness audit.
-- Run with: npx supabase test db

begin;
select plan(27);

-- Every application table is protected by RLS, including the server-only
-- message body table. Reference tables intentionally keep public read
-- policies, but are still RLS-enabled.
select ok(
  (select bool_and(c.relrowsecurity)
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and c.relname in (
       'organisations', 'organisation_domains', 'locations', 'areas',
       'profiles', 'interests', 'profile_interests', 'availabilities',
       'activities', 'activity_participants', 'official_events',
       'event_rsvps', 'blocks', 'connections', 'conversations',
       'messages', 'message_deleted_bodies', 'reports', 'status_posts'
     )),
  'all application tables have RLS enabled'
);

select is(
  (select count(*) from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and c.relname in (
       'organisations', 'organisation_domains', 'locations', 'areas',
       'profiles', 'interests', 'profile_interests', 'availabilities',
       'activities', 'activity_participants', 'official_events',
       'event_rsvps', 'blocks', 'connections', 'conversations',
       'messages', 'message_deleted_bodies', 'reports', 'status_posts'
     )),
  19::bigint,
  'the security audit covers all 19 application tables'
);

-- Anonymous clients must not read identity, activity, chat, RSVP or
-- moderation data directly. Public reference data remains intentionally
-- readable for the sign-up and area selectors.
select ok(
  not has_table_privilege('anon', 'public.profiles', 'select')
  and not has_table_privilege('anon', 'public.availabilities', 'select')
  and not has_table_privilege('anon', 'public.activities', 'select')
  and not has_table_privilege('anon', 'public.activity_participants', 'select')
  and not has_table_privilege('anon', 'public.official_events', 'select')
  and not has_table_privilege('anon', 'public.event_rsvps', 'select')
  and not has_table_privilege('anon', 'public.blocks', 'select')
  and not has_table_privilege('anon', 'public.connections', 'select')
  and not has_table_privilege('anon', 'public.conversations', 'select')
  and not has_table_privilege('anon', 'public.messages', 'select')
  and not has_table_privilege('anon', 'public.message_deleted_bodies', 'select')
  and not has_table_privilege('anon', 'public.reports', 'select')
  and not has_table_privilege('anon', 'public.status_posts', 'select'),
  'anon has no direct access to sensitive application tables'
);

select ok(
  not has_function_privilege('anon', 'public.active_map_points(uuid[], uuid, boolean)', 'execute')
  and has_function_privilege('authenticated', 'public.active_map_points(uuid[], uuid, boolean)', 'execute')
  and not has_function_privilege('anon', 'public.matching_suggestions(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.matching_suggestions(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.matching_candidates(uuid)', 'execute')
  and has_function_privilege('service_role', 'public.matching_candidates(uuid)', 'execute'),
  'map and matching functions expose the intended execution boundary'
);

select ok(
  not has_function_privilege('anon', 'public.expire_official_events()', 'execute')
  and not has_function_privilege('authenticated', 'public.expire_official_events()', 'execute'),
  'official-event expiry is system-only'
);

select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activities')
  and exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_participants')
  and exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'official_events')
  and exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_rsvps')
  and exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'status_posts')
  and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'availabilities'),
  'realtime publishes map-safe changes but not raw availability'
);

select ok(
  to_regprocedure('public.expire_official_events()') is not null
  and to_regprocedure('public.active_map_points(uuid[], uuid, boolean)') is not null
  and to_regprocedure('public.matching_suggestions(uuid)') is not null,
  'expiry, map and matching production entry points exist'
);

select ok(
  to_regclass('public.availabilities_area_end_time_idx') is not null
  and to_regclass('public.profile_interests_interest_profile_idx') is not null
  and to_regclass('public.connections_requester_status_idx') is not null
  and to_regclass('public.connections_addressee_status_idx') is not null,
  'matching and connection queries have supporting indexes'
);

-- The remaining checks audit the policy surface directly, so a future table
-- or policy change cannot silently remove an access-control boundary.
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'users can update their own profile'), 'profile updates have an owner policy');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'availabilities' and policyname = 'verified users can update their own availability'), 'availability updates have an owner policy');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'activities' and policyname = 'creators can update their own activities'), 'activity updates have an owner policy');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_participants' and policyname = 'participants leave, creators respond'), 'activity participant transitions have a policy');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'official_events' and policyname = 'org admins can update their organisation events'), 'official-event updates have an organisation-admin policy');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event_rsvps' and policyname = 'users can withdraw their own rsvp'), 'RSVP withdrawal has an owner policy');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'connections' and policyname = 'either side can act on their own connection'), 'connection actions have a participant policy');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'members can see their conversations'), 'conversation visibility has a membership policy');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'members can read messages'), 'message visibility has a membership policy');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blocks' and policyname = 'only the blocker can see their blocks'), 'block rows are private to the blocker');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reports' and policyname = 'reporters can see their own reports'), 'reports are private to the reporter');
select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'availabilities', 'activities', 'activity_participants', 'event_rsvps', 'blocks', 'connections', 'conversations', 'messages', 'reports')
      and roles::text like '%anon%'
  ),
  'sensitive tables have no anon RLS policies'
);
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_validate_email')
  and exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created_profile')
  and exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_state_changed'),
  'authentication edge-case triggers are installed'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.activities'::regclass and conname = 'activities_max_duration')
  and exists (select 1 from pg_constraint where conrelid = 'public.activities'::regclass and conname = 'activities_participant_limit_range')
  and exists (select 1 from pg_constraint where conrelid = 'public.activities'::regclass and conname = 'activities_coordinates_pair'),
  'activity input constraints protect time, capacity and map coordinates'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.official_events'::regclass and conname = 'official_events_coordinates_pair')
  and exists (select 1 from pg_constraint where conrelid = 'public.official_events'::regclass and conname = 'official_events_valid_time'),
  'official-event input constraints protect time and coordinates'
);
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'public.activities'::regclass and tgname = 'on_activity_write_guard')
  and exists (select 1 from pg_trigger where tgrelid = 'public.official_events'::regclass and tgname = 'on_official_event_updated'),
  'activity and official-event lifecycle triggers are installed'
);
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'public.messages'::regclass and tgname = 'on_message_write_guard')
  and exists (select 1 from pg_trigger where tgrelid = 'public.reports'::regclass and tgname = 'on_report_write_guard'),
  'chat and moderation guard triggers are installed'
);
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'public.activity_participants'::regclass and tgname = 'on_activity_participant_protected_fields')
  and not has_function_privilege('authenticated', 'public.prevent_activity_participant_protected_changes()', 'execute'),
  'activity participant identity and response metadata are protected'
);
select ok(
  not has_function_privilege('anon', 'public.email_domain(text)', 'execute')
  and not has_function_privilege('authenticated', 'public.email_domain(text)', 'execute')
  and not has_function_privilege('anon', 'public.guard_activity_write()', 'execute')
  and not has_function_privilege('authenticated', 'public.guard_activity_write()', 'execute')
  and not has_function_privilege('anon', 'public.create_activity_conversation()', 'execute')
  and not has_function_privilege('authenticated', 'public.create_activity_conversation()', 'execute')
  and has_function_privilege('authenticated', 'public.active_map_points(uuid[], uuid, boolean)', 'execute'),
  'internal trigger helpers are not RPC-callable while the map RPC remains available'
);

select * from finish();
rollback;
