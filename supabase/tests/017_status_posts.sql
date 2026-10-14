-- Persistent status posts: constraints, ownership and organisation scope.
begin;
select plan(8);

select has_table('public', 'status_posts', 'status_posts table exists');
select has_column('public', 'status_posts', 'organisation_id', 'status posts are scoped to an organisation');
select ok((select relrowsecurity from pg_class where oid = 'public.status_posts'::regclass), 'RLS is enabled');
select ok(not has_table_privilege('anon', 'public.status_posts', 'select'), 'anonymous users cannot read statuses');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'status_posts' and policyname = 'verified users can read statuses in their organisation'), 'read policy is organisation scoped');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000517',
  'authenticated', 'authenticated', 'status-post-test@student.uts.edu.au',
  crypt('Test-Password1', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Status Test","terms_accepted":true,"privacy_accepted":true}'::jsonb,
  now(), now(), '', ''
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000517', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok($$
  insert into public.status_posts (user_id, organisation_id, body)
  values ('00000000-0000-0000-0000-000000000517', '00000000-0000-0000-0000-000000000001', 'Hello Recess')
$$, 'verified user can publish a status to their organisation');

select is((select count(*)::int from public.status_posts), 1, 'author can read their persisted status');
select throws_ok($$
  insert into public.status_posts (user_id, organisation_id, body)
  values ('00000000-0000-0000-0000-000000000517', '00000000-0000-0000-0000-000000000002', 'Wrong organisation')
$$, '42501', null, 'user cannot publish to another organisation');

select * from finish();
rollback;
