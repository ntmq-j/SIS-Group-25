-- Persistent, organisation-scoped status updates for the Recess feed.
-- Posts intentionally contain no live GPS/location data.

create table if not exists public.status_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint status_posts_body_length check (char_length(btrim(body)) between 1 and 200)
);

create index if not exists status_posts_org_created_idx
  on public.status_posts (organisation_id, created_at desc);
create index if not exists status_posts_user_created_idx
  on public.status_posts (user_id, created_at desc);

alter table public.status_posts enable row level security;

create policy "verified users can read statuses in their organisation"
  on public.status_posts for select to authenticated
  using (
    public.is_verified_user()
    and organisation_id = (
      select p.organisation_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy "verified users can create their own statuses"
  on public.status_posts for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_verified_user()
    and organisation_id = (
      select p.organisation_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy "users can edit their own statuses"
  on public.status_posts for update to authenticated
  using (user_id = auth.uid() and public.is_verified_user())
  with check (
    user_id = auth.uid()
    and public.is_verified_user()
    and organisation_id = (
      select p.organisation_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy "users can delete their own statuses"
  on public.status_posts for delete to authenticated
  using (user_id = auth.uid() and public.is_verified_user());

grant select, insert, update, delete on public.status_posts to authenticated;
grant all privileges on public.status_posts to service_role;
revoke all on public.status_posts from anon;

create or replace function public.guard_status_post_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.organisation_id is distinct from old.organisation_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = 'P0001',
      message = '[forbidden] Status ownership and organisation cannot be changed.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger on_status_post_write
  before insert or update on public.status_posts
  for each row execute function public.guard_status_post_write();

do $$
begin
  alter publication supabase_realtime add table public.status_posts;
exception when duplicate_object then
  null;
when undefined_object then
  raise notice 'supabase_realtime publication is not available; status posts will load on refresh.';
end;
$$;
