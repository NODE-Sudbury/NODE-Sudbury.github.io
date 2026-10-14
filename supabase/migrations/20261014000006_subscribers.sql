-- People who subscribed to updates from the home page.
--
-- Anyone, signed in or not, can add their email. Nobody can read the list with the public key:
-- only the board can, to send the updates and to mark someone as unsubscribed. The same email
-- twice is refused, which the site treats as already subscribed.

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  constraint subscribers_email_format check (
    char_length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint subscribers_name_length check (
    char_length(first_name) <= 100 and char_length(last_name) <= 100
  )
);

-- One row per email, however it is capitalised.
create unique index if not exists subscribers_email_unique on public.subscribers (lower(email));

alter table public.subscribers enable row level security;

drop policy if exists subscribers_insert_anyone on public.subscribers;
create policy subscribers_insert_anyone on public.subscribers
  for insert to anon, authenticated
  with check (unsubscribed_at is null);

drop policy if exists subscribers_select_board on public.subscribers;
create policy subscribers_select_board on public.subscribers
  for select to authenticated
  using (public.current_user_role() = 'board');

drop policy if exists subscribers_update_board on public.subscribers;
create policy subscribers_update_board on public.subscribers
  for update to authenticated
  using (public.current_user_role() = 'board')
  with check (public.current_user_role() = 'board');

-- Only the columns a visitor fills in can be set by them.
revoke all on public.subscribers from anon, authenticated;
grant insert (email, first_name, last_name) on public.subscribers to anon, authenticated;
grant select, update on public.subscribers to authenticated;
