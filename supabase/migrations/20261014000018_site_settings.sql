-- Settings for the whole site that the admins can change: for now, N.O.D.E.'s social links.
--
-- Anyone can read them, because the public footer shows them. Only the super admin and admins change
-- them. The site reads them when it is built, so a change shows after the next deploy. A link that is
-- empty is left out of the footer, and a link with no row at all keeps the value from the site file.

create table if not exists public.site_settings (
  key text primary key
    check (key in ('social_x', 'social_instagram', 'social_facebook', 'social_linkedin')),
  value text not null default ''
    check (char_length(value) <= 500 and value ~* '^(https?://|$)'),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists site_settings_select_all on public.site_settings;
create policy site_settings_select_all on public.site_settings
  for select to anon, authenticated
  using (true);

drop policy if exists site_settings_insert_admin on public.site_settings;
create policy site_settings_insert_admin on public.site_settings
  for insert to authenticated
  with check (public.current_admin_role() in ('super_admin', 'admin'));

drop policy if exists site_settings_update_admin on public.site_settings;
create policy site_settings_update_admin on public.site_settings
  for update to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'))
  with check (public.current_admin_role() in ('super_admin', 'admin'));

drop policy if exists site_settings_delete_admin on public.site_settings;
create policy site_settings_delete_admin on public.site_settings
  for delete to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'));

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

-- The links the site has today, so the footer stays as it is until an admin changes them.
insert into public.site_settings (key, value) values
  ('social_x', 'https://x.com/nodesudbury'),
  ('social_instagram', 'https://www.instagram.com/nodesudbury'),
  ('social_facebook', 'https://www.facebook.com/nodesudbury'),
  ('social_linkedin', 'https://www.linkedin.com/company/node-northern-ontario-dev-exchange')
on conflict (key) do nothing;

-- The activity log names a setting by its key.
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
    coalesce(shown ->> 'id', shown ->> 'user_id', shown ->> 'key', ''),
    left(coalesce(shown ->> 'name', shown ->> 'full_name', shown ->> 'email', shown ->> 'handle', shown ->> 'key', ''), 200),
    coalesce(diff, shown)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists site_settings_audit on public.site_settings;
create trigger site_settings_audit after insert or update or delete on public.site_settings
  for each row execute function public.audit_row();
