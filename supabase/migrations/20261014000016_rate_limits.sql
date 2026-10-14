-- Rate limits for the functions the public can call.
--
-- Tables cannot be rate limited here, but the functions that answer a visitor can: looking up a
-- profile, checking a handle, and subscribing or unsubscribing. Each counts calls per caller in a
-- time window. An error would undo the count, so a caller over the limit is answered quietly: no
-- profile found, a handle that looks taken, and a subscribe or unsubscribe that does nothing.
-- The limits are far above what a person does, and low enough to stop scraping and spam.

create table if not exists public.rate_limits (
  bucket text not null,
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (bucket, key, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Who is calling: the address the gateway saw, or the last one in the forwarded list, which the
-- caller cannot make up. Empty for calls that do not come through the API.
create or replace function public.client_key()
returns text
language sql
stable
set search_path = public
as $$
  with headers as (
    select coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb) as h
  )
  select coalesce(
    nullif(h ->> 'cf-connecting-ip', ''),
    nullif(btrim(split_part(h ->> 'x-forwarded-for', ',', -1)), ''),
    ''
  )
  from headers;
$$;

-- Counts one call and says whether it is within the limit.
create or replace function public.rate_limit_ok(
  p_bucket text,
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  slot timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  total integer;
begin
  insert into public.rate_limits as r (bucket, key, window_start)
  values (p_bucket, p_key, slot)
  on conflict (bucket, key, window_start) do update set hits = r.hits + 1
  returning r.hits into total;
  -- Old windows are swept now and then, so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limits as old where old.window_start < now() - interval '2 days';
  end if;
  return total <= p_max;
end;
$$;

revoke all on function public.client_key() from public, anon, authenticated;
revoke all on function public.rate_limit_ok(text, text, integer, integer) from public, anon, authenticated;

-- A public profile, one at a time, at most 60 a minute from one caller.
create or replace function public.get_public_profile(p_handle text default null, p_id uuid default null)
returns setof public.public_profiles
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.rate_limit_ok('profile', public.client_key(), 60, 60) then
    return;
  end if;
  return query
    select * from public.public_profiles
    where (p_handle is not null and handle = lower(p_handle))
       or (p_id is not null and id = p_id)
    limit 1;
end;
$$;

-- Whether a handle is free, at most 30 a minute for one member.
create or replace function public.handle_available(candidate text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.rate_limit_ok('handle', coalesce(auth.uid()::text, public.client_key()), 30, 60) then
    return false;
  end if;
  return not exists (
    select 1
    from public.members
    where handle = lower(candidate)
      and id is distinct from auth.uid()
  );
end;
$$;

-- Subscribing: at most 10 an hour from one caller, and 3 an hour for one email.
create or replace function public.subscribe_email(
  p_email text,
  p_first_name text default '',
  p_last_name text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.rate_limit_ok('subscribe', public.client_key(), 10, 3600)
    or not public.rate_limit_ok('subscribe-email', lower(btrim(p_email)), 3, 3600)
  then
    return;
  end if;
  insert into public.subscribers (email, first_name, last_name)
  values (btrim(p_email), coalesce(p_first_name, ''), coalesce(p_last_name, ''))
  on conflict (lower(email)) do update set unsubscribed_at = null;
end;
$$;

-- Unsubscribing: at most 10 an hour from one caller, and 5 an hour for one email.
create or replace function public.unsubscribe_email(candidate text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.rate_limit_ok('unsubscribe', public.client_key(), 10, 3600)
    or not public.rate_limit_ok('unsubscribe-email', lower(btrim(candidate)), 5, 3600)
  then
    return;
  end if;
  update public.subscribers
  set unsubscribed_at = now()
  where lower(email) = lower(btrim(candidate)) and unsubscribed_at is null;
end;
$$;

-- The activity log records where the call came from, by the same rule.
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  new_row jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  old_row jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  shown jsonb := coalesce(new_row, old_row);
  owner uuid;
  diff jsonb;
begin
  begin
    owner := coalesce(shown ->> 'user_id', shown ->> 'id')::uuid;
  exception when others then
    owner := null;
  end;
  if tg_argv[0] = 'by_others' and (actor is null or actor = owner) then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(key, jsonb_build_object('from', old_row -> key, 'to', new_row -> key))
      into diff
      from jsonb_object_keys(new_row) as key
      where key <> 'updated_at' and (old_row -> key) is distinct from (new_row -> key);
    if diff is null then
      return new;
    end if;
  end if;
  insert into public.audit_log
    (actor_id, actor_email, actor_role, ip, action, target_table, target_id, summary, changes)
  values (
    actor,
    coalesce((select email from public.members where id = actor), ''),
    coalesce((select role from public.admins where user_id = actor), ''),
    public.client_key(),
    lower(tg_op),
    tg_table_name,
    coalesce(shown ->> 'id', shown ->> 'user_id', ''),
    left(coalesce(shown ->> 'name', shown ->> 'full_name', shown ->> 'email', shown ->> 'handle', ''), 200),
    coalesce(diff, shown)
  );
  return coalesce(new, old);
end;
$$;
