-- Who may add and remove the people who help run the site.
--
-- The super admin adds and removes board admins (`admin`) and volunteers (`check_in_volunteer`).
-- Admins add and remove volunteers only. Nobody can make another super admin, and the super admin
-- row stays protected by its trigger. The member who adds someone is kept in `added_by`, and the
-- database fills it in, so it cannot be set to somebody else.

alter table public.admins alter column added_by set default auth.uid();

drop policy if exists admins_insert on public.admins;
create policy admins_insert on public.admins
  for insert to authenticated
  with check (
    (added_by is null or added_by = auth.uid())
    and (
      (public.current_admin_role() = 'super_admin' and role in ('admin', 'check_in_volunteer'))
      or (public.current_admin_role() = 'admin' and role = 'check_in_volunteer')
    )
  );

drop policy if exists admins_update on public.admins;
create policy admins_update on public.admins
  for update to authenticated
  using (
    public.current_admin_role() = 'super_admin'
    or (public.current_admin_role() = 'admin' and role = 'check_in_volunteer')
  )
  with check (
    (public.current_admin_role() = 'super_admin' and role in ('admin', 'check_in_volunteer'))
    or (public.current_admin_role() = 'admin' and role = 'check_in_volunteer')
  );

drop policy if exists admins_delete on public.admins;
create policy admins_delete on public.admins
  for delete to authenticated
  using (
    (public.current_admin_role() = 'super_admin' and role <> 'super_admin')
    or (public.current_admin_role() = 'admin' and role = 'check_in_volunteer')
  );
