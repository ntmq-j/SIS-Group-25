-- Seed the shared interest catalogue used by Preferences and matching.
-- This is reference data, so the migration is idempotent and safe to apply
-- to a shared database that may already contain some of these names.
insert into public.interests (name)
values
  ('Coffee'),
  ('Cooking'),
  ('Gaming'),
  ('Hiking'),
  ('Live music'),
  ('Movies'),
  ('Reading'),
  ('Sports'),
  ('Study groups'),
  ('Technology'),
  ('Travel'),
  ('Volunteering')
on conflict (name) do nothing;
