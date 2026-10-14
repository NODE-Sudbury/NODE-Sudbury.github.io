-- The sponsors of NODE, and where their logos live. Like partners: anyone can read them, because
-- the public site shows them, and only the super admin and admins add, change or remove them.
-- A sponsor also has a tier. Each logo is a file in the public `sponsor-logos` storage bucket.

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  website_url text not null default '' check (char_length(website_url) <= 500),
  logo_path text not null default '' check (char_length(logo_path) <= 200),
  tier text not null default 'community'
    check (tier in ('platinum', 'gold', 'silver', 'bronze', 'community')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists sponsors_set_updated_at on public.sponsors;
create trigger sponsors_set_updated_at
  before update on public.sponsors
  for each row execute function public.set_updated_at();

alter table public.sponsors enable row level security;

drop policy if exists sponsors_select_all on public.sponsors;
create policy sponsors_select_all on public.sponsors
  for select to anon, authenticated
  using (true);

drop policy if exists sponsors_insert_admin on public.sponsors;
create policy sponsors_insert_admin on public.sponsors
  for insert to authenticated
  with check (public.current_admin_role() in ('super_admin', 'admin'));

drop policy if exists sponsors_update_admin on public.sponsors;
create policy sponsors_update_admin on public.sponsors
  for update to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'))
  with check (public.current_admin_role() in ('super_admin', 'admin'));

drop policy if exists sponsors_delete_admin on public.sponsors;
create policy sponsors_delete_admin on public.sponsors
  for delete to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'));

revoke all on public.sponsors from anon, authenticated;
grant select on public.sponsors to anon, authenticated;
grant insert, update, delete on public.sponsors to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sponsor-logos',
  'sponsor-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists sponsor_logos_select_all on storage.objects;
create policy sponsor_logos_select_all on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'sponsor-logos');

drop policy if exists sponsor_logos_insert_admin on storage.objects;
create policy sponsor_logos_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sponsor-logos' and public.current_admin_role() in ('super_admin', 'admin')
  );

drop policy if exists sponsor_logos_update_admin on storage.objects;
create policy sponsor_logos_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'sponsor-logos' and public.current_admin_role() in ('super_admin', 'admin'))
  with check (
    bucket_id = 'sponsor-logos' and public.current_admin_role() in ('super_admin', 'admin')
  );

drop policy if exists sponsor_logos_delete_admin on storage.objects;
create policy sponsor_logos_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'sponsor-logos' and public.current_admin_role() in ('super_admin', 'admin'));
