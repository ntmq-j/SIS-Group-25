begin;
select no_plan();
select is((select count(*)::int from public.locations where id in (
  'a5102100-0000-4000-8000-000000000001', 'a5102100-0000-4000-8000-000000000002',
  'a5102100-0000-4000-8000-000000000003', 'a5102100-0000-4000-8000-000000000004',
  'a5102100-0000-4000-8000-000000000005')), 5, 'all five official UTS sites/precincts are available');
select is((select count(*)::int from public.areas where location_id in (
  select id from public.locations where id::text like 'a5102100-%')), 12, 'UTS venue areas are available');
select is((select count(*)::int from public.locations l join public.organisation_domains d
  on d.organisation_id = l.organisation_id and d.domain = 'student.uts.edu.au'
  where l.id::text like 'a5102100-%'), 5, 'campuses belong to the verified UTS organisation');
select ok((select latitude between -33.889 and -33.886 and longitude between 151.223 and 151.226
  from public.locations where name = 'UTS Moore Park'), 'Moore Park uses its own site coordinates');
select ok((select latitude between -33.940 and -33.936 and longitude between 151.198 and 151.201
  from public.locations where name = 'UTS Botany - Tech Lab'), 'Botany uses its own site coordinates');
set local role anon;
select is((select count(*)::int from public.areas where location_id in (
  select id from public.locations where id::text like 'a5102100-%')), 12, 'approved areas remain publicly readable');
reset role;
set local role authenticated;
select throws_ok($$insert into public.areas (location_id, name, type)
  values ('a5102100-0000-4000-8000-000000000001', 'Unapproved venue', 'other')$$,
  '42501', null, 'RLS prevents users adding unapproved areas');
reset role;
select * from finish();
rollback;
