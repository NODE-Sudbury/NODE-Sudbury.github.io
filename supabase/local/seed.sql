-- Made-up data for a local database, so every page and the admin dashboard have something to show.
--
-- None of it is real: the people, the addresses (`example.test`) and the organizations are invented.
-- `supabase/local/reset.sh` runs this after the migrations. Sign in to the local site with an
-- email link: the local mail inbox is at http://127.0.0.1:54324. Sign in as
-- `admin@example.test` to see the admin dashboard as the super admin.

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001', 'admin@example.test', '{"full_name": "Ada Admin"}'),
  ('00000000-0000-4000-8000-000000000002', 'grace@example.test', '{"full_name": "Grace Member"}'),
  ('00000000-0000-4000-8000-000000000003', 'linus@example.test', '{"full_name": "Linus Student"}'),
  ('00000000-0000-4000-8000-000000000004', 'private@example.test', '{"full_name": "Pat Private"}')
on conflict (id) do nothing;

-- The sign-in trigger made a row for each of them. Fill in what they would have put on their profile.
update public.members set handle = 'ada', member_type = 'professional', job_title = 'Engineer',
  company = 'Example Corp', bio = 'I run the local test site.', github_url = 'https://github.com/example'
  where email = 'admin@example.test';
update public.members set handle = 'grace', member_type = 'professional', job_title = 'Developer',
  company = 'Example Labs', bio = 'A member with a public page.', is_exclusive_member = true
  where email = 'grace@example.test';
update public.members set handle = 'linus', member_type = 'student', school = 'Example University',
  program = 'Computer Science', bio = 'A student member.'
  where email = 'linus@example.test';
update public.members set is_public = false where email = 'private@example.test';

insert into public.admins (user_id, role)
select id, 'super_admin' from public.members where email = 'admin@example.test'
on conflict do nothing;

insert into public.partners (name, website_url, logo_path, sort_order) values
  ('Example Foundry', 'https://example.test/foundry', '', 0),
  ('Example Community', 'https://example.test/community', '', 1)
on conflict do nothing;

insert into public.board_members (name, title, photo_path, user_id, sort_order)
select 'Ada Admin', 'President', '', id, 0 from public.members where email = 'admin@example.test'
on conflict do nothing;
insert into public.board_members (name, title, photo_path, sort_order) values
  ('Sam Example', 'Treasurer', '', 1),
  ('Robin Example', 'Technical Lead', '', 2)
on conflict do nothing;
