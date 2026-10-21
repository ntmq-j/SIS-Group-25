begin;
select plan(7);

select is((select count(*)::int from public.interests where name in (
  'Art & creativity', 'Career & networking', 'Fitness & wellbeing',
  'Food & dining', 'Languages & culture', 'Pets & animals'
)), 6, 'six broad interests extend the catalogue');

select is((select count(*)::int from public.interests where name in (
  'Coffee', 'Cooking', 'Gaming', 'Hiking', 'Live music', 'Movies',
  'Reading', 'Sports', 'Study groups', 'Technology', 'Travel', 'Volunteering'
)), 12, 'the original interests remain available');

select is((select count(*)::int from (
  select lower(btrim(name)) from public.interests
  group by lower(btrim(name)) having count(*) > 1
) duplicates), 0, 'the catalogue contains no duplicate labels');

select ok(not exists (select 1 from public.interests
  where name <> btrim(name) or length(name) = 0), 'labels are nonempty and trimmed');

-- A replay must not replace IDs, remove existing topics or duplicate entries.
insert into public.interests (name) values ('QA preserved interest');
create temporary table interests_before as select id, name from public.interests;
-- The pg_prove container only mounts the tests directory, not migrations.
-- Exercise the same idempotent reference-data insert here.
insert into public.interests (name) values
  ('Art & creativity'), ('Career & networking'), ('Fitness & wellbeing'),
  ('Food & dining'), ('Languages & culture'), ('Pets & animals')
on conflict (name) do nothing;

select is((select count(*) from public.interests),
  (select count(*) from interests_before), 'reapplying reference data does not add duplicates');
select results_eq('select id, name from public.interests order by id',
  'select id, name from interests_before order by id',
  'existing IDs stay unchanged so profile selections remain valid');
select ok(exists (select 1 from public.interests where name = 'QA preserved interest'),
  'other existing interests are never removed');

select * from finish();
rollback;
