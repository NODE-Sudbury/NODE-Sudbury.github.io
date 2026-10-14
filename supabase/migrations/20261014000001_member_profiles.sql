-- Public member profiles for the NODE website.
--
-- Additive and safe to run again: it adds columns, a view, a policy and a guard trigger, and does
-- not change or drop anything that exists. It works on the development project, which has the
-- full members table, and on production, which has the early one, because it adds every column it
-- needs when it is missing.

alter table public.members add column if not exists is_public boolean not null default true;
alter table public.members add column if not exists role text not null default 'member';
alter table public.members add column if not exists is_super_admin boolean not null default false;
alter table public.members add column if not exists bio text;
alter table public.members add column if not exists pronouns text;
alter table public.members add column if not exists skills text[];
alter table public.members add column if not exists discord_tag text;

-- The short name in a member's public address: /members/<handle>. Three to thirty lowercase
-- letters, digits and hyphens, not starting or ending with a hyphen. Each one is unique.
alter table public.members add column if not exists handle text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_handle_format') then
    alter table public.members
      add constraint members_handle_format
      check (handle is null or handle ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$');
  end if;
end $$;

create unique index if not exists members_handle_key on public.members (handle) where handle is not null;

-- A member can always read their own row.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'members' and policyname = 'members_select_own'
  ) then
    create policy members_select_own on public.members for select using (auth.uid() = id);
  end if;
end $$;

-- What the public sees of a member: a profile they made public and gave an address. Never the
-- email or the role. The view reads the table as its owner, so it needs no open policy on it.
create or replace view public.public_profiles as
  select
    handle,
    full_name,
    avatar_url,
    member_type,
    job_title,
    company,
    school,
    program,
    bio,
    pronouns,
    skills,
    linkedin_url,
    github_url,
    twitter_url,
    website_url,
    created_at
  from public.members
  where is_public and is_active and handle is not null;

grant select on public.public_profiles to anon, authenticated;

-- Members edit their own profile, but must not give themselves a role. Only the board, or the
-- database itself with no signed-in member, can change these fields.
create or replace function public.members_guard_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if exists (select 1 from public.members m where m.id = auth.uid() and m.role = 'board') then
    return new;
  end if;
  if new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.is_super_admin is distinct from old.is_super_admin
    or new.is_active is distinct from old.is_active
  then
    raise exception 'Only the board can change these member fields.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists members_guard_columns on public.members;
create trigger members_guard_columns
  before update on public.members
  for each row execute function public.members_guard_columns();
