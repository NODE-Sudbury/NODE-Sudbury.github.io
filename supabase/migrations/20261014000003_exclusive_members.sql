-- Adds the exclusive member flag and the member id to the public profile view.
--
-- Additive and safe to run again. It adds one column, replaces the guard function so only the board
-- can change the new column, and adds two columns to the end of the public view.

alter table public.members add column if not exists is_exclusive_member boolean not null default false;

-- Members edit their own profile but must not make themselves exclusive members, which is for the
-- board to grant. The same guard as before, with the new column added.
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
    or new.is_exclusive_member is distinct from old.is_exclusive_member
  then
    raise exception 'Only the board can change these member fields.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- The public view gains the member id, so old /profile/<id> links still find a profile, and the
-- exclusive member flag. New columns go at the end, which `create or replace view` allows. A public
-- member shows here with or without a handle: members are public by default, as on the old site,
-- and a handle only gives them a nicer address.
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
    created_at,
    id,
    is_exclusive_member
  from public.members
  where is_public and is_active;

grant select on public.public_profiles to anon, authenticated;
