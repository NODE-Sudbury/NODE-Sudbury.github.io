-- The activity log: who added, changed or deleted what in the admin-managed tables.
--
-- Rows are written by triggers, never by the site, and nobody can change or delete them, not even
-- the super admin or the database owner without dropping the trigger first. Only the super admin
-- can read the log. A change is stored as the fields that differ, from and to, so the log shows what
-- was changed without keeping a full copy of every row.

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- Who did it, as it was at the time: the account, their email and their admin role.
  actor_id uuid,
  actor_email text not null default '',
  actor_role text not null default '',
  -- Where the request came from, as the API gateway reports it.
  ip text not null default '',
  action text not null check (action in ('insert', 'update', 'delete')),
  target_table text not null,
  target_id text not null default '',
  -- A short name for the row, such as a person's name or a partner's name.
  summary text not null default '',
  -- For a change: { field: { from, to } }. For an addition or a deletion: the whole row.
  changes jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_table_idx on public.audit_log (target_table, at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id, at desc);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_super_admin on public.audit_log;
create policy audit_log_select_super_admin on public.audit_log
  for select to authenticated
  using (public.current_admin_role() = 'super_admin');

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- The log cannot be edited or emptied.
create or replace function public.audit_log_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'The activity log cannot be changed or deleted.' using errcode = '42501';
end;
$$;

drop trigger if exists audit_log_no_change on public.audit_log;
create trigger audit_log_no_change
  before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

drop trigger if exists audit_log_no_truncate on public.audit_log;
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.audit_log_immutable();

-- Writes one log row for a change to the table it is attached to. With the argument
-- 'by_others', only changes made by a signed-in person to somebody else's row are logged, which
-- leaves out a member editing their own profile and visitors who subscribe.
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  new_row jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  old_row jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  shown jsonb := coalesce(new_row, old_row);
  owner uuid;
  diff jsonb;
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
begin
  begin
    owner := coalesce(shown ->> 'user_id', shown ->> 'id')::uuid;
  exception when others then
    owner := null;
  end;
  if tg_argv[0] = 'by_others' and (actor is null or actor = owner) then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(key, jsonb_build_object('from', old_row -> key, 'to', new_row -> key))
      into diff
      from jsonb_object_keys(new_row) as key
      where key <> 'updated_at' and (old_row -> key) is distinct from (new_row -> key);
    -- Nothing but the update time moved, so there is nothing to log.
    if diff is null then
      return new;
    end if;
  end if;
  insert into public.audit_log
    (actor_id, actor_email, actor_role, ip, action, target_table, target_id, summary, changes)
  values (
    actor,
    coalesce((select email from public.members where id = actor), ''),
    coalesce((select role from public.admins where user_id = actor), ''),
    coalesce(split_part(headers ->> 'x-forwarded-for', ',', 1), ''),
    lower(tg_op),
    tg_table_name,
    coalesce(shown ->> 'id', shown ->> 'user_id', ''),
    left(coalesce(shown ->> 'name', shown ->> 'full_name', shown ->> 'email', shown ->> 'handle', ''), 200),
    coalesce(diff, shown)
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_row() from public, anon, authenticated;

-- The tables the admins manage. The admins table logs every change, including who gave whom a role.
drop trigger if exists admins_audit on public.admins;
create trigger admins_audit after insert or update or delete on public.admins
  for each row execute function public.audit_row();

drop trigger if exists partners_audit on public.partners;
create trigger partners_audit after insert or update or delete on public.partners
  for each row execute function public.audit_row();

drop trigger if exists sponsors_audit on public.sponsors;
create trigger sponsors_audit after insert or update or delete on public.sponsors
  for each row execute function public.audit_row();

drop trigger if exists board_members_audit on public.board_members;
create trigger board_members_audit after insert or update or delete on public.board_members
  for each row execute function public.audit_row();

drop trigger if exists members_audit on public.members;
create trigger members_audit after update or delete on public.members
  for each row execute function public.audit_row('by_others');

drop trigger if exists subscribers_audit on public.subscribers;
create trigger subscribers_audit after update or delete on public.subscribers
  for each row execute function public.audit_row('by_others');
