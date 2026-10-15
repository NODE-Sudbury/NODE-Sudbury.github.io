-- The board members N.O.D.E. shows as cards: name, title, photo and links. They are not the same as
-- the dashboard admins. A card can optionally be linked to a member account, so a person's card
-- and their account are tied together. The home page still reads its own board data for now.
--
-- Anyone can read the cards, because they are public. Only the super admin and admins change them.
-- Each photo is a file in the public `board-photos` storage bucket.

create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  title text not null default '' check (char_length(title) <= 120),
  photo_path text not null default '' check (char_length(photo_path) <= 200),
  linkedin_url text not null default '' check (char_length(linkedin_url) <= 500),
  github_url text not null default '' check (char_length(github_url) <= 500),
  twitter_url text not null default '' check (char_length(twitter_url) <= 500),
  website_url text not null default '' check (char_length(website_url) <= 500),
  -- The member account this card belongs to, if any. If the member goes, the card stays.
  user_id uuid references public.members (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A member has at most one card.
create unique index if not exists board_members_user_unique on public.board_members (user_id)
  where user_id is not null;

drop trigger if exists board_members_set_updated_at on public.board_members;
create trigger board_members_set_updated_at
  before update on public.board_members
  for each row execute function public.set_updated_at();

alter table public.board_members enable row level security;

drop policy if exists board_members_select_all on public.board_members;
create policy board_members_select_all on public.board_members
  for select to anon, authenticated
  using (true);

drop policy if exists board_members_insert_admin on public.board_members;
create policy board_members_insert_admin on public.board_members
  for insert to authenticated
  with check (public.current_admin_role() in ('super_admin', 'admin'));

drop policy if exists board_members_update_admin on public.board_members;
create policy board_members_update_admin on public.board_members
  for update to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'))
  with check (public.current_admin_role() in ('super_admin', 'admin'));

drop policy if exists board_members_delete_admin on public.board_members;
create policy board_members_delete_admin on public.board_members
  for delete to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'));

revoke all on public.board_members from anon, authenticated;
grant select on public.board_members to anon, authenticated;
grant insert, update, delete on public.board_members to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board-photos',
  'board-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists board_photos_select_all on storage.objects;
create policy board_photos_select_all on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'board-photos');

drop policy if exists board_photos_insert_admin on storage.objects;
create policy board_photos_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'board-photos' and public.current_admin_role() in ('super_admin', 'admin')
  );

drop policy if exists board_photos_update_admin on storage.objects;
create policy board_photos_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'board-photos' and public.current_admin_role() in ('super_admin', 'admin'))
  with check (
    bucket_id = 'board-photos' and public.current_admin_role() in ('super_admin', 'admin')
  );

drop policy if exists board_photos_delete_admin on storage.objects;
create policy board_photos_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'board-photos' and public.current_admin_role() in ('super_admin', 'admin'));
