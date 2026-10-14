-- Starts the database from scratch for the new website.
--
-- The old dashboard and admin left over a hundred tables behind. The new site needs the members
-- table (profiles and links are its columns), the accounts Supabase keeps in its own `auth`
-- schema, the `avatars` photo storage, the public profile view, and the few functions that sign-in,
-- handles and the role guard use. This drops everything else in the `public` schema.
--
-- It cannot be undone: back up first (`pg_dump --schema=public`). Safe to run again. New features
-- add their own tables from here, each with row level security on from the start.

do $$
declare
  item record;
begin
  -- Views other than the public profile view, such as the old leaderboards.
  for item in
    select table_name from information_schema.views
    where table_schema = 'public' and table_name <> 'public_profiles'
  loop
    execute format('drop view if exists public.%I cascade', item.table_name);
  end loop;

  -- Every table but members.
  for item in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE' and table_name <> 'members'
  loop
    execute format('drop table if exists public.%I cascade', item.table_name);
  end loop;

  -- Every function but the ones the new site uses.
  for item in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname not in (
        'current_user_role',
        'handle_new_user',
        'handle_available',
        'members_guard_columns',
        'set_updated_at',
        'rls_auto_enable'
      )
  loop
    execute format('drop function if exists %s cascade', item.signature);
  end loop;

  -- Enum types that no members column uses.
  for item in
    select t.typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype = 'e'
      and not exists (
        select 1 from pg_attribute a
        where a.attrelid = 'public.members'::regclass and a.atttypid = t.oid and not a.attisdropped
      )
  loop
    execute format('drop type if exists public.%I cascade', item.typname);
  end loop;
end $$;

-- Members columns that belonged to the old points and chapters systems.
alter table public.members drop column if exists total_points;
alter table public.members drop column if exists chapter_id;
