-- Private, persistent read cursors. Clients cannot write arbitrary timestamps
-- or mark messages read on behalf of another user.
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null,
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;
create policy "users see only their own read cursors"
  on public.conversation_reads for select to authenticated
  using (user_id = auth.uid() and public.is_verified_user());
revoke all on public.conversation_reads from public, anon, authenticated;
grant select on public.conversation_reads to authenticated;
grant all on public.conversation_reads to service_role;

create function public.mark_conversation_read(p_conversation_id uuid, p_message_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_created_at timestamptz;
begin
  if not public.is_verified_user() or not public.is_conversation_member(p_conversation_id) then
    raise exception '[forbidden] You cannot read this conversation.' using errcode = '42501';
  end if;
  select m.created_at into v_created_at from public.messages m
  where m.id = p_message_id and m.conversation_id = p_conversation_id
    and not public.is_blocked_between(m.sender_id);
  if v_created_at is null then
    raise exception '[forbidden] This message is not available.' using errcode = '42501';
  end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (p_conversation_id, auth.uid(), least(v_created_at, now()))
  on conflict (conversation_id, user_id) do update
    set last_read_at = greatest(conversation_reads.last_read_at, excluded.last_read_at);
end;
$$;

-- Invoker security deliberately retains messages/conversations RLS, including
-- membership and block checks. Neither message text nor other users' cursors
-- are returned by this RPC.
create function public.conversation_unread_counts()
returns table (conversation_id uuid, unread_count bigint)
language sql stable security invoker set search_path = public
as $$
  select c.id, count(m.id)
  from public.conversations c
  left join public.conversation_reads r on r.conversation_id = c.id and r.user_id = auth.uid()
  left join public.messages m on m.conversation_id = c.id
    and m.sender_id <> auth.uid() and m.deleted_at is null
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  group by c.id;
$$;

revoke all on function public.mark_conversation_read(uuid, uuid) from public, anon;
revoke all on function public.conversation_unread_counts() from public, anon;
grant execute on function public.mark_conversation_read(uuid, uuid) to authenticated;
grant execute on function public.conversation_unread_counts() to authenticated;
alter publication supabase_realtime add table public.conversation_reads;
