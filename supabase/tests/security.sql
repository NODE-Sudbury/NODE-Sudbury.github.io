-- Checks what each kind of user can read and write, as the database sees them.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
--
-- Everything runs in one transaction that is rolled back at the end, so no data changes. It needs
-- a super admin in `admins` and at least one other member. A failed check stops the run with the
-- name of the check.

begin;

create function pg_temp.fail(label text) returns void language plpgsql as $$
begin
  raise exception 'SECURITY CHECK FAILED: %', label;
end;
$$;

create table pg_temp.results (label text);

-- Runs a statement as a role and user, and says whether it worked and changed at least one row.
-- Anything it changed is undone.
create function pg_temp.can(role_name text, uid uuid, stmt text) returns boolean
language plpgsql as $$
declare
  changed bigint;
begin
  begin
    execute format('set local role %I', role_name);
    perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
    execute stmt;
    get diagnostics changed = row_count;
    if changed < 1 then
      raise exception 'NOTHING';
    end if;
    raise exception 'ALLOWED';
  exception when others then
    return sqlerrm = 'ALLOWED';
  end;
end;
$$;

-- How many rows a query returns as a role and user, or -1 when it is refused.
create function pg_temp.seen(role_name text, uid uuid, query text) returns integer
language plpgsql as $$
declare
  total integer;
begin
  begin
    execute format('set local role %I', role_name);
    perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
    execute format('select count(*) from (%s) q', query) into total;
    raise exception 'COUNT %', total;
  exception when others then
    if sqlerrm like 'COUNT %' then
      return split_part(sqlerrm, ' ', 2)::integer;
    end if;
    return -1;
  end;
end;
$$;

create function pg_temp.check_that(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then
    perform pg_temp.fail(label);
  end if;
  insert into pg_temp.results values (label);
end;
$$;

do $$
declare
  boss uuid := (select user_id from public.admins where role = 'super_admin');
  other uuid := (select id from public.members where id <> (select user_id from public.admins where role = 'super_admin') limit 1);
  someone uuid := coalesce(other, boss);
begin
  if boss is null then
    raise exception 'There is no super admin in the admins table.';
  end if;
  if other is null then
    raise notice 'Only one member exists, so the checks about a second member are skipped.';
  end if;

  -- Visitors who are not signed in ---------------------------------------------------------------
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.members') = -1, 'visitor cannot read members');
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.admins') = -1, 'visitor cannot read admins');
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.audit_log') = -1, 'visitor cannot read the activity log');
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.subscribers') = -1, 'visitor cannot read subscribers');
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.public_profiles') = -1, 'visitor cannot list public profiles');
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.partners') >= 0, 'visitor can read partners');
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.sponsors') >= 0, 'visitor can read sponsors');
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.board_members') >= 0, 'visitor can read the board');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$update public.public_profiles set is_exclusive_member = true$q$), 'visitor cannot write through the public profile view');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$delete from public.public_profiles$q$), 'visitor cannot delete through the public profile view');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$update public.members set bio = 'x'$q$), 'visitor cannot update members');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$delete from public.members$q$), 'visitor cannot delete members');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$insert into public.partners(name) values ('x')$q$), 'visitor cannot add a partner');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$insert into public.sponsors(name) values ('x')$q$), 'visitor cannot add a sponsor');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$insert into public.board_members(name) values ('x')$q$), 'visitor cannot add a board card');
  perform pg_temp.check_that(not pg_temp.can('anon', null, format($q$insert into public.admins(user_id, role) values (%L, 'admin')$q$, someone)), 'visitor cannot make an admin');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$insert into public.audit_log(action, target_table) values ('insert', 'x')$q$), 'visitor cannot write to the activity log');
  perform pg_temp.check_that(pg_temp.can('anon', null, $q$insert into public.subscribers(email) values ('visitor-check@example.com')$q$), 'visitor can subscribe');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$insert into public.subscribers(email, unsubscribed_at) values ('visitor-check2@example.com', now())$q$), 'visitor cannot set the unsubscribe date');
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.get_public_profile(''nobody-has-this'')') = 0, 'looking up an unknown profile gives nothing');
  perform pg_temp.check_that(not pg_temp.can('anon', null, 'select public.current_admin_role()'), 'visitor cannot ask for an admin role');
  perform pg_temp.check_that(not pg_temp.can('anon', null, 'select public.handle_available(''x1'')'), 'visitor cannot probe handles');

  -- A signed-in member who is nothing else -------------------------------------------------------
  if other is not null then
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.members') = 1, 'member sees only their own row');
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.admins') = 0, 'member sees no admins');
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.audit_log') = 0, 'member cannot read the activity log');
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.subscribers') = 0, 'member sees no subscribers');
    perform pg_temp.check_that(pg_temp.can('authenticated', other, format($q$update public.members set bio = 'hello' where id = %L$q$, other)), 'member can edit their own bio');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.members set is_exclusive_member = true where id = %L$q$, other)), 'member cannot make themselves exclusive');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.members set role = 'board' where id = %L$q$, other)), 'member cannot change their own role');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.members set is_super_admin = true where id = %L$q$, other)), 'member cannot make themselves super admin');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.members set is_active = false where id = %L$q$, other)), 'member cannot change their own active flag');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.members set email = 'x@example.com' where id = %L$q$, other)), 'member cannot change their own email');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.members set bio = 'hacked' where id = %L$q$, boss)), 'member cannot edit another member');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.members set id = gen_random_uuid() where id = %L$q$, other)), 'member cannot change their own id');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$delete from public.members where id = %L$q$, other)), 'member cannot delete themselves through the API');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, $q$insert into public.partners(name) values ('x')$q$), 'member cannot add a partner');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, $q$insert into public.sponsors(name) values ('x')$q$), 'member cannot add a sponsor');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, $q$insert into public.board_members(name) values ('x')$q$), 'member cannot add a board card');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$insert into public.admins(user_id, role) values (%L, 'admin')$q$, other)), 'member cannot make themselves an admin');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, $q$update public.subscribers set unsubscribed_at = now()$q$), 'member cannot change subscribers');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, $q$insert into public.audit_log(action, target_table) values ('insert', 'x')$q$), 'member cannot write to the activity log');
    perform pg_temp.check_that(pg_temp.can('authenticated', other, 'select public.current_admin_role()'), 'a signed-in member can ask for their own admin role');
  end if;

  -- A check-in volunteer ------------------------------------------------------------------------
  if other is not null then
    insert into public.admins (user_id, role) values (other, 'check_in_volunteer');
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.admins') = 1, 'volunteer sees only their own team row');
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.members') = 1, 'volunteer cannot read the member list');
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.subscribers') = 0, 'volunteer cannot read subscribers');
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.audit_log') = 0, 'volunteer cannot read the activity log');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, $q$insert into public.partners(name) values ('x')$q$), 'volunteer cannot add a partner');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, $q$insert into public.board_members(name) values ('x')$q$), 'volunteer cannot add a board card');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$insert into public.admins(user_id, role) values (%L, 'check_in_volunteer')$q$, boss)), 'volunteer cannot add anyone to the team');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.admins set role = 'admin' where user_id = %L$q$, other)), 'volunteer cannot promote themselves');
    delete from public.admins where user_id = other;
  end if;

  -- A dashboard admin ---------------------------------------------------------------------------
  if other is not null then
    insert into public.admins (user_id, role) values (other, 'admin');
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.members') >= 2, 'admin can read the member list');
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.admins') >= 2, 'admin can read the team');
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select 1 from public.audit_log') = 0, 'admin cannot read the activity log');
    perform pg_temp.check_that(pg_temp.can('authenticated', other, $q$insert into public.partners(name) values ('Admin Partner')$q$), 'admin can add a partner');
    perform pg_temp.check_that(pg_temp.can('authenticated', other, $q$insert into public.sponsors(name) values ('Admin Sponsor')$q$), 'admin can add a sponsor');
    perform pg_temp.check_that(pg_temp.can('authenticated', other, $q$insert into public.board_members(name) values ('Admin Card')$q$), 'admin can add a board card');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.members set bio = 'hacked' where id = %L$q$, boss)), 'admin cannot edit another member through the API');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.members set is_exclusive_member = true where id = %L$q$, boss)), 'admin cannot set the exclusive flag through the API');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$insert into public.admins(user_id, role) values (%L, 'admin')$q$, boss)), 'admin cannot add a dashboard admin');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, $q$delete from public.admins where role = 'super_admin'$q$), 'admin cannot remove the super admin');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.admins set role = 'super_admin' where user_id = %L$q$, other)), 'admin cannot promote themselves to super admin');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, format($q$update public.admins set role = 'admin' where user_id = %L$q$, boss)), 'admin cannot demote the super admin');
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, $q$insert into public.audit_log(action, target_table) values ('insert', 'x')$q$), 'admin cannot write to the activity log');
    delete from public.admins where user_id = other;
  end if;

  -- The super admin -----------------------------------------------------------------------------
  perform pg_temp.check_that(pg_temp.seen('authenticated', boss, 'select 1 from public.audit_log') >= 0, 'super admin can read the activity log');
  perform pg_temp.check_that(pg_temp.can('authenticated', boss, format($q$insert into public.admins(user_id, role) values (%L, 'admin')$q$, someone)) or other is null, 'super admin can add a dashboard admin');
  perform pg_temp.check_that(not pg_temp.can('authenticated', boss, format($q$insert into public.admins(user_id, role) values (%L, 'super_admin')$q$, someone)), 'nobody can add a second super admin');
  perform pg_temp.check_that(not pg_temp.can('authenticated', boss, $q$delete from public.admins where role = 'super_admin'$q$), 'even the super admin cannot be removed');
  perform pg_temp.check_that(not pg_temp.can('authenticated', boss, $q$update public.admins set role = 'admin' where role = 'super_admin'$q$), 'even the super admin cannot be demoted');
  perform pg_temp.check_that(not pg_temp.can('authenticated', boss, $q$update public.audit_log set summary = 'x'$q$), 'the activity log cannot be edited');
  perform pg_temp.check_that(not pg_temp.can('authenticated', boss, $q$delete from public.audit_log$q$), 'the activity log cannot be emptied');
  perform pg_temp.check_that(not pg_temp.can('authenticated', boss, $q$insert into public.audit_log(action, target_table) values ('insert', 'forged')$q$), 'nobody can write a log entry by hand');

  -- Site settings -------------------------------------------------------------------------------
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.site_settings') >= 0, 'visitor can read the site settings');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$update public.site_settings set value = 'https://evil.example'$q$), 'visitor cannot change the site settings');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$insert into public.site_settings(key, value) values ('social_x', 'https://evil.example')$q$), 'visitor cannot add a site setting');
  perform pg_temp.check_that(pg_temp.can('authenticated', boss, $q$update public.site_settings set value = 'https://www.instagram.com/changed' where key = 'social_instagram'$q$) or not exists (select 1 from public.site_settings where key = 'social_instagram'), 'super admin can change a site setting');
  perform pg_temp.check_that(not pg_temp.can('authenticated', boss, $q$insert into public.site_settings(key, value) values ('anything_else', 'x')$q$), 'only the known settings can exist');
  perform pg_temp.check_that(not pg_temp.can('authenticated', boss, $q$update public.site_settings set value = 'javascript:alert(1)' where key = 'social_x'$q$), 'a setting must be a web address');
  if other is not null then
    perform pg_temp.check_that(not pg_temp.can('authenticated', other, $q$update public.site_settings set value = 'https://evil.example'$q$), 'member cannot change the site settings');
    insert into public.admins (user_id, role) values (other, 'admin');
    perform pg_temp.check_that(pg_temp.can('authenticated', other, $q$update public.site_settings set value = 'https://www.facebook.com/changed' where key = 'social_facebook'$q$) or not exists (select 1 from public.site_settings where key = 'social_facebook'), 'admin can change a site setting');
    delete from public.admins where user_id = other;
  end if;

  -- Page view counts -----------------------------------------------------------------------------
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.page_views') = -1, 'visitor cannot read the page view table');
  perform pg_temp.check_that(pg_temp.seen('authenticated', boss, 'select 1 from public.page_views') = -1, 'even the super admin reads page views only through the functions');
  perform pg_temp.check_that(pg_temp.can('anon', null, $q$select public.record_page_view('/check')$q$), 'visitor can report a page view');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$select * from public.analytics_pages(7)$q$), 'visitor cannot read the page view numbers');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$select * from public.analytics_daily(7)$q$), 'visitor cannot read the daily numbers');
  if other is not null then
    perform pg_temp.check_that(pg_temp.seen('authenticated', other, 'select * from public.analytics_pages(7)') = 0, 'a member gets no page view numbers');
  end if;
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$insert into public.page_views(path, views) values ('/forged', 999)$q$), 'visitor cannot write page views by hand');

  -- Rate limits ---------------------------------------------------------------------------------
  perform pg_temp.check_that(
    public.rate_limit_ok('check', 'a', 2, 60) and public.rate_limit_ok('check', 'a', 2, 60)
      and not public.rate_limit_ok('check', 'a', 2, 60) and public.rate_limit_ok('check', 'b', 2, 60),
    'the limiter cuts off the third call, and counts each caller apart'
  );
  perform set_config('request.headers', '{"cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "6.6.6.6, 198.51.100.4"}', true);
  perform pg_temp.check_that(public.client_key() = '203.0.113.9', 'a caller is known by the address the gateway saw');
  perform set_config('request.headers', '{"x-forwarded-for": "6.6.6.6, 198.51.100.4"}', true);
  perform pg_temp.check_that(public.client_key() = '198.51.100.4', 'a made-up forwarded address does not count');
  perform pg_temp.check_that(not pg_temp.can('anon', null, $q$select public.rate_limit_ok('x', 'y', 1, 60)$q$), 'visitor cannot use the limiter directly');
  perform pg_temp.check_that(pg_temp.seen('anon', null, 'select 1 from public.rate_limits') = -1, 'visitor cannot read the limiter counts');
  perform pg_temp.check_that(pg_temp.seen('authenticated', boss, 'select 1 from public.rate_limits') = -1, 'a signed-in member cannot read the limiter counts');
  perform set_config('request.headers', '', true);

  -- Changes are logged -------------------------------------------------------------------------
  perform pg_temp.check_that(pg_temp.can('authenticated', boss, $q$insert into public.partners(name) values ('Super Admin Partner')$q$), 'super admin can add a partner');
end $$;

-- A change made as a signed-in admin leaves a line in the log, with who did it.
do $$
declare
  boss uuid := (select user_id from public.admins where role = 'super_admin');
  before_count bigint := (select count(*) from public.audit_log);
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', boss::text, true);
  insert into public.partners (name) values ('Audit Check Partner');
  update public.partners set name = 'Audit Check Partner 2' where name = 'Audit Check Partner';
  delete from public.partners where name = 'Audit Check Partner 2';
  reset role;
  perform pg_temp.check_that((select count(*) from public.audit_log) = before_count + 3, 'an added, a changed and a deleted row are all logged');
  perform pg_temp.check_that(
    (select count(*) from public.audit_log where actor_id = boss and actor_role = 'super_admin' and summary like 'Audit Check Partner%') = 3,
    'the log says who did it and in what role'
  );
end $$;

select count(*) || ' security checks passed' as result from pg_temp.results;

rollback;
