begin;
select no_plan();

create function pg_temp.notification_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, crypt('RecessTest123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Notification test","terms_accepted":true,"privacy_accepted":true}', now(), now(), '', '');
  return v_id;
end $$;
select pg_temp.notification_user('notify-alice@student.uts.edu.au') as alice \gset
select pg_temp.notification_user('notify-bob@student.uts.edu.au') as bob \gset
select pg_temp.notification_user('notify-carol@student.uts.edu.au') as carol \gset

insert into public.conversations (kind, user_a, user_b)
values ('private', least(:'alice'::uuid, :'bob'::uuid), greatest(:'alice'::uuid, :'bob'::uuid))
returning id as chat \gset
insert into public.conversations (kind, user_a, user_b)
values ('private', least(:'bob'::uuid, :'carol'::uuid), greatest(:'bob'::uuid, :'carol'::uuid))
returning id as other_chat \gset
insert into public.messages (conversation_id, sender_id, body, created_at)
values (:'chat', :'bob', 'First incoming', now() - interval '3 minutes') returning id as first_message \gset
insert into public.messages (conversation_id, sender_id, body, created_at)
values (:'chat', :'bob', 'Second incoming', now() - interval '2 minutes') returning id as second_message \gset
insert into public.messages (conversation_id, sender_id, body, created_at)
values (:'chat', :'alice', 'My message', now() - interval '1 minute') returning id as own_message \gset
insert into public.messages (conversation_id, sender_id, body, deleted_at)
values (:'chat', :'bob', '', now());
insert into public.messages (conversation_id, sender_id, body)
values (:'other_chat', :'bob', 'Private to Carol') returning id as other_message \gset

select ok(not has_table_privilege('anon', 'public.conversation_reads', 'SELECT'), 'anonymous users cannot read cursors');
select ok(not has_function_privilege('anon', 'public.conversation_unread_counts()', 'EXECUTE'), 'anonymous users cannot request unread counts');
select ok(not has_function_privilege('anon', 'public.mark_conversation_read(uuid,uuid)', 'EXECUTE'), 'anonymous users cannot mark messages read');
select ok(not has_table_privilege('authenticated', 'public.conversation_reads', 'INSERT'), 'clients cannot forge read cursors');
select ok(not has_table_privilege('authenticated', 'public.conversation_reads', 'UPDATE'), 'clients cannot write arbitrary read timestamps');
select is((select count(*)::int from pg_publication_tables where pubname = 'supabase_realtime'
  and schemaname = 'public' and tablename in ('conversation_reads', 'connections', 'blocks')), 3, 'notification sources support realtime');

set local role authenticated;
select set_config('request.jwt.claim.sub', :'alice', true);
select is((select unread_count from public.conversation_unread_counts() where conversation_id = :'chat'), 2::bigint,
  'only incoming, non-deleted messages are unread');
select is((select count(*)::int from public.conversation_unread_counts()), 1, 'only member conversations are exposed');
select throws_ok(format('select public.mark_conversation_read(%L,%L)', :'other_chat', :'other_message'),
  '42501', null, 'outsiders cannot mark another conversation read');
select throws_ok(format('select public.mark_conversation_read(%L,%L)', :'chat', :'other_message'),
  '42501', null, 'message must belong to the selected conversation');
select lives_ok(format('select public.mark_conversation_read(%L,%L)', :'chat', :'first_message'), 'members can mark a visible message read');
select is((select unread_count from public.conversation_unread_counts() where conversation_id = :'chat'), 1::bigint, 'newer messages remain unread');
select public.mark_conversation_read(:'chat', :'second_message');
select is((select unread_count from public.conversation_unread_counts() where conversation_id = :'chat'), 0::bigint, 'reading the latest incoming message clears the badge');
select public.mark_conversation_read(:'chat', :'first_message');
select is((select unread_count from public.conversation_unread_counts() where conversation_id = :'chat'), 0::bigint, 'late requests cannot move a cursor backwards');
select throws_ok(format('delete from public.conversation_reads where conversation_id = %L', :'chat'),
  '42501', null, 'clients cannot delete a persisted cursor');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'bob', true);
select is((select count(*)::int from public.conversation_reads), 0, 'another member cannot see Alice read timestamps');
select is((select unread_count from public.conversation_unread_counts() where conversation_id = :'chat'), 1::bigint, 'reading for Alice does not clear Bob badge');
select public.mark_conversation_read(:'chat', :'own_message');
select is((select count(*)::int from public.conversation_reads), 1, 'each member sees only their own cursor');

reset role;
select set_config('request.jwt.claim.sub', '', true);
insert into public.messages (conversation_id, sender_id, body)
values (:'chat', :'bob', 'New after read');
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alice', true);
select is((select unread_count from public.conversation_unread_counts() where conversation_id = :'chat'), 1::bigint, 'new messages increment persisted unread state');
insert into public.blocks (blocker_id, blocked_id) values (:'alice', :'bob');
select is((select count(*)::int from public.conversation_unread_counts()), 0, 'blocked private chats are not leaked through unread counts');
select throws_ok(format('select public.mark_conversation_read(%L,%L)', :'chat', :'second_message'),
  '42501', null, 'blocked chats cannot be marked read');
reset role;
select * from finish();
rollback;
