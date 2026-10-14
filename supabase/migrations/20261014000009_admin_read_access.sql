-- Lets the super admin and admins read the members list and the subscribers list, for the admin
-- dashboard. Read only: changing members or subscribers stays with the board role and the
-- functions that already exist. Check-in volunteers get nothing here.

drop policy if exists members_select_admin on public.members;
create policy members_select_admin on public.members
  for select to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'));

drop policy if exists subscribers_select_admin on public.subscribers;
create policy subscribers_select_admin on public.subscribers
  for select to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin'));
