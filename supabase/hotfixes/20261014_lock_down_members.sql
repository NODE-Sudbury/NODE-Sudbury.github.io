-- Closes the security holes found in the production database, which only has the early schema
-- (the members table, its public view and a few functions). It is a small part of migration
-- 20261014000015_security_hardening.sql, for a database that does not have the admins, partners,
-- sponsors, board or activity tables yet. Run it on its own:
--
--   psql "$SUPABASE_PROD_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f supabase/hotfixes/20261014_lock_down_members.sql
--
-- What it fixes:
--   1. Anyone could change or delete members through the public profile view.
--   2. Visitors and members held every privilege on the members table, such as delete and truncate.
--   3. The old `board` role could read and change every member.
--   4. A visitor could list the whole avatars bucket.
-- It does not change what the live site shows: the public profile still works, by one profile at a time.

-- 1. The public profile view is no longer read or written directly ----------------------------------

revoke all on public.public_profiles from anon, authenticated;

create or replace function public.get_public_profile(p_handle text default null, p_id uuid default null)
returns setof public.public_profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.public_profiles
  where (p_handle is not null and handle = lower(p_handle))
     or (p_id is not null and id = p_id)
  limit 1;
$$;

revoke all on function public.get_public_profile(text, uuid) from public;
grant execute on function public.get_public_profile(text, uuid) to anon, authenticated;

-- 2. Privileges ---------------------------------------------------------------------------------------

revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;
grant update (
  full_name, avatar_url, member_type, job_title, company, school, program, bio, pronouns, skills,
  discord_tag, linkedin_url, github_url, twitter_url, website_url, is_public, handle
) on public.members to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.members_guard_columns() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- 3. The old board role -----------------------------------------------------------------------------

drop policy if exists board_members_read_all on public.members;
drop policy if exists board_members_update_any on public.members;

drop policy if exists members_select_own on public.members;
create policy members_select_own on public.members
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists members_update_own on public.members;
create policy members_update_own on public.members
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

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
  if new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.is_super_admin is distinct from old.is_super_admin
    or new.is_active is distinct from old.is_active
    or new.is_exclusive_member is distinct from old.is_exclusive_member
  then
    raise exception 'These member fields cannot be changed here.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 4. Storage ----------------------------------------------------------------------------------------

-- The avatars bucket: public by link, but nobody can list it, and a member writes only to their own
-- folder. Created here if it does not exist, so every database gets the same rules.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_owner_select on storage.objects;
drop policy if exists avatars_owner_insert on storage.objects;
drop policy if exists avatars_owner_update on storage.objects;
drop policy if exists avatars_owner_delete on storage.objects;

create policy avatars_owner_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);
