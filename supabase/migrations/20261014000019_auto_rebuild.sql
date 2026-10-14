-- Rebuilds the public site when an admin changes what it shows.
--
-- The site is built ahead of time, so the footer links, the board, the partners and the sponsors
-- are baked into the pages. When an admin saves a change to one of them, this asks Vercel for a new
-- build, which takes about two minutes. The address that starts a build is a secret kept in the
-- Vault under `site_rebuild_hook`, one for each Supabase project. Without that secret, nothing
-- happens, and a call that fails never stops the save.

create extension if not exists pg_net with schema extensions;

-- pg_net and the Vault are not reachable through the API: Supabase exposes only the `public` and
-- `graphql_public` schemas, so visitors and members cannot read the request log or the secret, or
-- make web requests of their own. Keep it that way: never add `net` or `vault` to the exposed schemas.

create or replace function public.request_site_rebuild()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hook text;
begin
  begin
    select decrypted_secret into hook
    from vault.decrypted_secrets
    where name = 'site_rebuild_hook'
    limit 1;
    if hook is not null and hook <> '' then
      perform net.http_post(url := hook, body := '{}'::jsonb);
    end if;
  exception when others then
    -- Saving a change matters more than rebuilding the site.
    raise warning 'Could not ask for a rebuild: %', sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.request_site_rebuild() from public, anon, authenticated;

-- One request for each statement, so saving the four social links at once asks once.
drop trigger if exists site_settings_rebuild on public.site_settings;
create trigger site_settings_rebuild after insert or update or delete on public.site_settings
  for each statement execute function public.request_site_rebuild();

drop trigger if exists board_members_rebuild on public.board_members;
create trigger board_members_rebuild after insert or update or delete on public.board_members
  for each statement execute function public.request_site_rebuild();

drop trigger if exists partners_rebuild on public.partners;
create trigger partners_rebuild after insert or update or delete on public.partners
  for each statement execute function public.request_site_rebuild();

drop trigger if exists sponsors_rebuild on public.sponsors;
create trigger sponsors_rebuild after insert or update or delete on public.sponsors
  for each statement execute function public.request_site_rebuild();
