-- Closes a leak in the original members policies. With them, anyone holding the public anon key
-- (it ships in every web page) can read every active member's row, including the email and role,
-- through the REST API.
--
-- After this, the public reads members only through public.public_profiles, a member reads their
-- own row, and the board reads all rows. It drops two policies, so it is not additive: run it
-- deliberately, on the development project first.

drop policy if exists members_select_active on public.members;
drop policy if exists "Public profiles are viewable by anyone" on public.members;
