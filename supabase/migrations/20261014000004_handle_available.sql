-- Lets a signed-in member ask whether a handle is free before they save it.
--
-- The answer has to count every member, including those with a private profile, which the
-- member can not read. So the function reads the table as its owner and returns only yes or no:
-- nothing about who has the handle. A member's own handle counts as free for them.

create or replace function public.handle_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.members
    where handle = lower(candidate)
      and id is distinct from auth.uid()
  );
$$;

revoke all on function public.handle_available(text) from public, anon;
grant execute on function public.handle_available(text) to authenticated;
