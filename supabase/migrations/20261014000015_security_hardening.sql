-- Security hardening, from the security review of the database.
--
-- 1. The public profile view could be written to by anyone, which bypassed every rule on `members`.
--    Nobody reads it directly any more: a function returns one profile at a time, so the list of
--    members cannot be pulled in one request either.
-- 2. Supabase gives `anon` and `authenticated` every privilege on new tables. They get only what
--    they need, and new tables start with none.
-- 3. The old `board` role on `members` could read and change every member. Access now comes from
--    the `admins` table alone.
-- 4. Storage: the public buckets can still be read by their links, but nobody can list them.
-- 5. Links must be web addresses, text is limited in length and the reserved handles are taken.

-- 1. The public profile, one at a time -------------------------------------------------------------

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

-- 2. Privileges --------------------------------------------------------------------------------

-- What a member may do to their own profile. The role, flags, email and id are not in the list, so
-- the API cannot write them for anybody.
revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;
grant update (
  full_name, avatar_url, member_type, job_title, company, school, program, bio, pronouns, skills,
  discord_tag, linkedin_url, github_url, twitter_url, website_url, is_public, handle
) on public.members to authenticated;

revoke all on public.subscribers from authenticated;
grant select, update on public.subscribers to authenticated;

-- New tables, sequences and functions start with no access for the API roles.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- The trigger functions are not meant to be called through the API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.members_guard_columns() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.admins_protect_super_admin() from public, anon, authenticated;
revoke execute on function public.audit_log_immutable() from public, anon, authenticated;
revoke execute on function public.current_user_role() from public, anon;

-- 3. The old board role ------------------------------------------------------------------------

drop policy if exists board_members_read_all on public.members;
drop policy if exists board_members_update_any on public.members;
drop policy if exists subscribers_select_board on public.subscribers;
drop policy if exists subscribers_update_board on public.subscribers;

drop policy if exists subscribers_update_admin on public.subscribers;
create policy subscribers_update_admin on public.subscribers
  for update to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'))
  with check (public.current_admin_role() in ('super_admin', 'admin'));

-- A member sees and changes only their own row, signed in, and cannot hand the row to someone else.
drop policy if exists members_select_own on public.members;
create policy members_select_own on public.members
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists members_update_own on public.members;
create policy members_update_own on public.members
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- The guard no longer lets a `board` role through. Nobody can change these fields through the API.
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

-- A new member starts with the name from their sign-in, but a photo only if it is a web address.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  photo text := new.raw_user_meta_data ->> 'avatar_url';
begin
  insert into public.members (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    left(new.raw_user_meta_data ->> 'full_name', 120),
    case when photo ~* '^https://' and char_length(photo) <= 500 then photo else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. Storage -----------------------------------------------------------------------------------

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

drop policy if exists partner_logos_select_all on storage.objects;
drop policy if exists sponsor_logos_select_all on storage.objects;
drop policy if exists board_photos_select_all on storage.objects;

drop policy if exists partner_logos_select_admin on storage.objects;
create policy partner_logos_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'partner-logos' and public.current_admin_role() in ('super_admin', 'admin'));
drop policy if exists sponsor_logos_select_admin on storage.objects;
create policy sponsor_logos_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'sponsor-logos' and public.current_admin_role() in ('super_admin', 'admin'));
drop policy if exists board_photos_select_admin on storage.objects;
create policy board_photos_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'board-photos' and public.current_admin_role() in ('super_admin', 'admin'));

-- Logos are shown through image tags only. SVG files can carry scripts, so they are not accepted.
update storage.buckets
  set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id in ('partner-logos', 'sponsor-logos');

-- 5. Data rules, for new and changed rows ---------------------------------------------------------

alter table public.partners drop constraint if exists partners_website_is_web_address;
alter table public.partners add constraint partners_website_is_web_address
  check (website_url ~* '^(https?://|$)') not valid;

alter table public.sponsors drop constraint if exists sponsors_website_is_web_address;
alter table public.sponsors add constraint sponsors_website_is_web_address
  check (website_url ~* '^(https?://|$)') not valid;

alter table public.board_members drop constraint if exists board_members_links_are_web_addresses;
alter table public.board_members add constraint board_members_links_are_web_addresses
  check (
    linkedin_url ~* '^(https?://|$)' and github_url ~* '^(https?://|$)'
    and twitter_url ~* '^(https?://|$)' and website_url ~* '^(https?://|$)'
  ) not valid;

alter table public.members drop constraint if exists members_links_are_web_addresses;
alter table public.members add constraint members_links_are_web_addresses
  check (
    coalesce(linkedin_url, '') ~* '^(https?://|$)' and coalesce(github_url, '') ~* '^(https?://|$)'
    and coalesce(twitter_url, '') ~* '^(https?://|$)' and coalesce(website_url, '') ~* '^(https?://|$)'
    and coalesce(avatar_url, '') ~* '^(https?://|$)'
  ) not valid;

alter table public.members drop constraint if exists members_text_lengths;
alter table public.members add constraint members_text_lengths
  check (
    char_length(coalesce(full_name, '')) <= 120 and char_length(coalesce(job_title, '')) <= 120
    and char_length(coalesce(company, '')) <= 120 and char_length(coalesce(school, '')) <= 120
    and char_length(coalesce(program, '')) <= 120 and char_length(coalesce(pronouns, '')) <= 60
    and char_length(coalesce(bio, '')) <= 2000
  ) not valid;

-- Handles that could pass for the site or its people cannot be taken.
alter table public.members drop constraint if exists members_handle_not_reserved;
alter table public.members add constraint members_handle_not_reserved
  check (
    handle is null or handle not in (
      'admin', 'administrator', 'root', 'support', 'help', 'security', 'staff', 'owner', 'official',
      'moderator', 'node', 'nodesudbury', 'board', 'team', 'events', 'api', 'www', 'account', 'profile',
      'members', 'login', 'signin', 'signup', 'sign-in', 'sign-up', 'dashboard', 'settings'
    )
  ) not valid;
