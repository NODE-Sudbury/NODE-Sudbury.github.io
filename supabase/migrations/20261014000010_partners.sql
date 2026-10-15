-- The organizations N.O.D.E. works with, and where their logos live.
--
-- Anyone can read the partners, because the public site shows them. Only the super admin and
-- admins add, change or remove them. Each logo is a file in the public `partner-logos` storage
-- bucket, and the table keeps its path inside that bucket.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  website_url text not null default '' check (char_length(website_url) <= 500),
  logo_path text not null default '' check (char_length(logo_path) <= 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists partners_set_updated_at on public.partners;
create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

alter table public.partners enable row level security;

drop policy if exists partners_select_all on public.partners;
create policy partners_select_all on public.partners
  for select to anon, authenticated
  using (true);

drop policy if exists partners_insert_admin on public.partners;
create policy partners_insert_admin on public.partners
  for insert to authenticated
  with check (public.current_admin_role() in ('super_admin', 'admin'));

drop policy if exists partners_update_admin on public.partners;
create policy partners_update_admin on public.partners
  for update to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'))
  with check (public.current_admin_role() in ('super_admin', 'admin'));

drop policy if exists partners_delete_admin on public.partners;
create policy partners_delete_admin on public.partners
  for delete to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'));

revoke all on public.partners from anon, authenticated;
grant select on public.partners to anon, authenticated;
grant insert, update, delete on public.partners to authenticated;

-- The logo bucket: public to read, small images only, and only admins write to it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-logos',
  'partner-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Listing the logos is harmless, since the bucket is public. Replacing a file needs it as well.
drop policy if exists partner_logos_select_all on storage.objects;
create policy partner_logos_select_all on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'partner-logos');

drop policy if exists partner_logos_insert_admin on storage.objects;
create policy partner_logos_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'partner-logos' and public.current_admin_role() in ('super_admin', 'admin')
  );

drop policy if exists partner_logos_update_admin on storage.objects;
create policy partner_logos_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'partner-logos' and public.current_admin_role() in ('super_admin', 'admin'))
  with check (
    bucket_id = 'partner-logos' and public.current_admin_role() in ('super_admin', 'admin')
  );

drop policy if exists partner_logos_delete_admin on storage.objects;
create policy partner_logos_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'partner-logos' and public.current_admin_role() in ('super_admin', 'admin'));
