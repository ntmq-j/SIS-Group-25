-- Official UTS map: https://maps.uts.edu.au/map.cfm (checked 21 October 2026).
-- Broadway, Haymarket and Blackfriars are City campus precincts, not separate
-- universities. Moore Park and Botany are the other sites on the official map.
-- Keep existing City Campus/area IDs and their activities unchanged.
do $$
declare
  v_org uuid;
begin
  select organisation_id into v_org from public.organisation_domains
  where domain in ('uts.edu.au', 'student.uts.edu.au') order by domain limit 1;
  if v_org is null then
    select id into v_org from public.organisations
    where lower(name) = 'university of technology sydney' limit 1;
  end if;
  if v_org is null then
    -- Match the established development seed ID on a clean installation too;
    -- seed runs AFTER migrations. Existing installations resolve above.
    insert into public.organisations (id, name, type)
    values ('00000000-0000-0000-0000-000000000001', 'University of Technology Sydney', 'university') returning id into v_org;
  end if;

  insert into public.organisation_domains (organisation_id, domain)
  values (v_org, 'uts.edu.au'), (v_org, 'student.uts.edu.au')
  on conflict (domain) do nothing;

  -- Each site's own coordinates remain the 250 m meeting-point anchor.
  insert into public.locations (id, organisation_id, name, type, latitude, longitude)
  values
    ('a5102100-0000-4000-8000-000000000001', v_org, 'UTS City Campus - Broadway', 'campus', -33.8834983998, 151.200883761),
    ('a5102100-0000-4000-8000-000000000002', v_org, 'UTS City Campus - Haymarket', 'campus', -33.8807706522, 151.201947927),
    ('a5102100-0000-4000-8000-000000000003', v_org, 'UTS City Campus - Blackfriars', 'campus', -33.8848692463, 151.198360205),
    ('a5102100-0000-4000-8000-000000000004', v_org, 'UTS Moore Park', 'campus', -33.8876755815, 151.224171706),
    ('a5102100-0000-4000-8000-000000000005', v_org, 'UTS Botany - Tech Lab', 'campus', -33.9383054054, 151.199270077)
  on conflict (id) do nothing;

  insert into public.areas (id, location_id, name, type)
  values
    ('a5102100-0000-4000-8000-000000000101', 'a5102100-0000-4000-8000-000000000001', 'Broadway meeting point', 'other'),
    ('a5102100-0000-4000-8000-000000000102', 'a5102100-0000-4000-8000-000000000001', 'UTS Tower (CB01)', 'building'),
    ('a5102100-0000-4000-8000-000000000103', 'a5102100-0000-4000-8000-000000000001', 'UTS Central (CB02)', 'building'),
    ('a5102100-0000-4000-8000-000000000104', 'a5102100-0000-4000-8000-000000000001', 'Bon Marche (CB03)', 'building'),
    ('a5102100-0000-4000-8000-000000000105', 'a5102100-0000-4000-8000-000000000001', 'Vicki Sara Building (CB07)', 'building'),
    ('a5102100-0000-4000-8000-000000000106', 'a5102100-0000-4000-8000-000000000002', 'Haymarket meeting point', 'other'),
    ('a5102100-0000-4000-8000-000000000107', 'a5102100-0000-4000-8000-000000000002', 'Building 5 Block A (CB05A)', 'building'),
    ('a5102100-0000-4000-8000-000000000108', 'a5102100-0000-4000-8000-000000000002', 'Dr Chau Chak Wing Building (CB08)', 'building'),
    ('a5102100-0000-4000-8000-000000000109', 'a5102100-0000-4000-8000-000000000003', 'Blackfriars meeting point', 'other'),
    ('a5102100-0000-4000-8000-000000000110', 'a5102100-0000-4000-8000-000000000003', 'Graduate School of Health (CB20)', 'building'),
    ('a5102100-0000-4000-8000-000000000111', 'a5102100-0000-4000-8000-000000000004', 'Rugby Australia Building (MP01)', 'building'),
    ('a5102100-0000-4000-8000-000000000112', 'a5102100-0000-4000-8000-000000000005', 'UTS Tech Lab (BP01, BP03, BP05)', 'building')
  on conflict (id) do nothing;
end $$;
