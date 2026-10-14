-- The table that the migrations start from.
--
-- The two Supabase projects were made before these migrations, with a `members` table that
-- `20261014000001_member_profiles.sql` adds to. A new, empty database has no such table, so this
-- creates the early one. It is only for a local database (`supabase/local/reset.sh`): the projects
-- on the Supabase cloud already have it. Never run it against them.

create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  member_type text not null default 'professional',
  job_title text,
  company text,
  school text,
  program text,
  linkedin_url text,
  github_url text,
  twitter_url text,
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.members enable row level security;

-- The role of the signed-in member, which the first board policies use. The function body is read
-- when it runs, so it can name the `role` column that the first migration adds.
create or replace function public.current_user_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (select role from public.members where id = auth.uid());
end;
$$;

-- Keeps `updated_at` current. The partners and board tables use it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Makes the member's row when someone first signs in. `20261014000015_security_hardening.sql`
-- replaces the body, and the sign-in trigger below calls it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The Supabase dashboard adds this to its projects, and migration 15 locks it down. Here it does
-- nothing, so the migration finds it.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
as $$
begin
  null;
end;
$$;
