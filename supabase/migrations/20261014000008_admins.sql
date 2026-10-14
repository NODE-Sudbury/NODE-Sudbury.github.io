-- Who runs the site, and what each of them may do.
--
-- Three roles: `super_admin`, `admin` and `check_in_volunteer`. There is exactly one super admin,
-- and that row can never be deleted or changed, not by the site and not by a cascade from deleting
-- the member. Only the super admin adds, changes or removes the others. An admin can see the list,
-- and everyone can see their own row, which is how the site knows what to show them.

create table if not exists public.admins (
  user_id uuid primary key references public.members (id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin', 'check_in_volunteer')),
  added_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now()
);

-- At most one super admin.
create unique index if not exists admins_one_super_admin on public.admins (role)
  where role = 'super_admin';

create or replace function public.admins_protect_super_admin()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'super_admin' then
    raise exception 'The super admin cannot be changed or removed.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists admins_protect_super_admin on public.admins;
create trigger admins_protect_super_admin
  before update or delete on public.admins
  for each row execute function public.admins_protect_super_admin();

-- The signed-in member's admin role, or null. A function, so the policies below can use it without
-- reading the table they protect.
create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.admins where user_id = auth.uid();
$$;

revoke all on function public.current_admin_role() from public, anon;
grant execute on function public.current_admin_role() to authenticated;

alter table public.admins enable row level security;

drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins
  for select to authenticated
  using (user_id = auth.uid() or public.current_admin_role() in ('super_admin', 'admin'));

-- Only the super admin adds people, and never another super admin.
drop policy if exists admins_insert on public.admins;
create policy admins_insert on public.admins
  for insert to authenticated
  with check (
    public.current_admin_role() = 'super_admin' and role in ('admin', 'check_in_volunteer')
  );

drop policy if exists admins_update on public.admins;
create policy admins_update on public.admins
  for update to authenticated
  using (public.current_admin_role() = 'super_admin')
  with check (public.current_admin_role() = 'super_admin' and role in ('admin', 'check_in_volunteer'));

drop policy if exists admins_delete on public.admins;
create policy admins_delete on public.admins
  for delete to authenticated
  using (public.current_admin_role() = 'super_admin');

revoke all on public.admins from anon, authenticated;
grant select, insert, update, delete on public.admins to authenticated;
