-- Page view counts: how often each page of the site is opened.
--
-- It is built for privacy. Only the page's address and the day are kept, as a count: no cookies, no
-- addresses of visitors, no accounts. Every page of the site reports itself from the shared layout,
-- so a new blog post is counted without anyone registering it. Only the super admin and admins can
-- read the counts.
--
-- Anyone can report a view, so it is guarded: the address must look like a page of the site, a
-- caller can report only so many a minute, and a day keeps at most 2000 different addresses, so
-- made-up addresses cannot fill the table.

create table if not exists public.page_views (
  day date not null default ((now() at time zone 'utc')::date),
  path text not null check (path ~ '^/[a-z0-9/_.-]{0,119}$'),
  views integer not null default 0,
  primary key (day, path)
);

alter table public.page_views enable row level security;
revoke all on public.page_views from anon, authenticated;

-- Counts one view of a page. Anything that is not a page of the site is dropped without a word.
create or replace function public.record_page_view(p_path text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  clean text := lower(split_part(split_part(coalesce(p_path, ''), '?', 1), '#', 1));
  today date := (now() at time zone 'utc')::date;
begin
  clean := regexp_replace(clean, '/+$', '');
  if clean = '' then
    clean := '/';
  end if;
  if clean !~ '^/[a-z0-9/_.-]{0,119}$' then
    return;
  end if;
  if not public.rate_limit_ok('view', public.client_key(), 120, 60) then
    return;
  end if;
  if not exists (select 1 from public.page_views where day = today and path = clean)
    and (select count(*) from public.page_views where day = today) >= 2000
  then
    return;
  end if;
  insert into public.page_views as v (day, path, views)
  values (today, clean, 1)
  on conflict (day, path) do update set views = v.views + 1;
end;
$$;

revoke all on function public.record_page_view(text) from public;
grant execute on function public.record_page_view(text) to anon, authenticated;

-- The most viewed pages over the last p_days days, for the super admin and admins.
create or replace function public.analytics_pages(p_days integer default 30)
returns table (path text, views bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.path, sum(v.views)::bigint as views
  from public.page_views v
  where public.current_admin_role() in ('super_admin', 'admin')
    and v.day > (now() at time zone 'utc')::date - greatest(least(coalesce(p_days, 30), 365), 1)
  group by v.path
  order by views desc, v.path
  limit 1000;
$$;

-- Views per day over the last p_days days, one row for every day, for the super admin and admins.
create or replace function public.analytics_daily(p_days integer default 30)
returns table (day date, views bigint)
language sql
stable
security definer
set search_path = public
as $$
  with span as (
    select greatest(least(coalesce(p_days, 30), 365), 1) as days
  )
  select d::date as day, coalesce(sum(v.views), 0)::bigint as views
  from span,
       generate_series(
         (now() at time zone 'utc')::date - (span.days - 1),
         (now() at time zone 'utc')::date,
         interval '1 day'
       ) as d
  left join public.page_views v on v.day = d::date
  where public.current_admin_role() in ('super_admin', 'admin')
  group by d
  order by d;
$$;

revoke all on function public.analytics_pages(integer) from public, anon;
revoke all on function public.analytics_daily(integer) from public, anon;
grant execute on function public.analytics_pages(integer) to authenticated;
grant execute on function public.analytics_daily(integer) to authenticated;
