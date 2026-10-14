-- Lets a visitor unsubscribe, and subscribe again, without signing in.
--
-- Visitors cannot change the subscribers table themselves, so these two functions do it for them.
-- Neither says whether an email was on the list, so they cannot be used to find out who is.

create or replace function public.unsubscribe_email(candidate text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.subscribers
  set unsubscribed_at = now()
  where lower(email) = lower(btrim(candidate)) and unsubscribed_at is null;
$$;

-- Adds an email, or turns a returning one back on after they unsubscribed.
create or replace function public.subscribe_email(p_email text, p_first_name text default '', p_last_name text default '')
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.subscribers (email, first_name, last_name)
  values (btrim(p_email), coalesce(p_first_name, ''), coalesce(p_last_name, ''))
  on conflict (lower(email)) do update set unsubscribed_at = null;
$$;

revoke all on function public.unsubscribe_email(text) from public;
revoke all on function public.subscribe_email(text, text, text) from public;
grant execute on function public.unsubscribe_email(text) to anon, authenticated;
grant execute on function public.subscribe_email(text, text, text) to anon, authenticated;
