-- Keep the shared catalogue compact: six broad topics rather than many
-- specialist hobbies. Existing interest IDs and profile selections stay intact.
insert into public.interests (name)
values
  ('Art & creativity'),
  ('Career & networking'),
  ('Fitness & wellbeing'),
  ('Food & dining'),
  ('Languages & culture'),
  ('Pets & animals')
on conflict (name) do nothing;
