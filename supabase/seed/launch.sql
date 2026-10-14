-- The data a new production database starts with, copied from what the development database holds.
--
-- Run it once, after the migrations, and before the first production deploy:
--
--   psql "$SUPABASE_PROD_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f supabase/seed/launch.sql
--
-- It is safe to run twice: each part only fills what is empty. People are found by email, never by
-- the ids of the development database, which differ. The photos and logos these rows name are files,
-- which `supabase/seed/upload-images.mjs` puts in storage. See `supabase/LAUNCH.md` for the order.

-- The API returns at most 1000 rows to a request. Development has the same limit.
alter role authenticator set pgrst.db_max_rows = '1000';
notify pgrst, 'reload config';

-- The super admin: the founder's account. The account must have signed in once, so it has a member row.
do $$
declare
  founder uuid := (select id from public.members where email = 'hannanmaxdev@gmail.com');
begin
  if exists (select 1 from public.admins where role = 'super_admin') then
    raise notice 'There is already a super admin, so none was added.';
  elsif founder is null then
    raise exception 'hannanmaxdev@gmail.com has not signed in to this site yet, so there is no member to make super admin. Sign in once, then run this again.';
  else
    insert into public.admins (user_id, role) values (founder, 'super_admin');
  end if;
end $$;

-- The partners of the home page, with the logos in the partner-logos bucket.
insert into public.partners (name, website_url, logo_path, sort_order)
select * from (values
    ('Laurentian University Foundry', 'https://laurentian.ca/research/fielding-innovation-centre/foundry', 'foundry.jpg', 0),
    ('GDG Sudbury', 'https://gdg.community.dev/gdg-sudbury/', 'gdg-sudbury.jpg', 1),
    ('Norcat', 'https://www.norcat.org/', 'norcat.jpg', 2),
    ('Cursor Sudbury', 'https://luma.com/spacexai-sudbury?period=past', 'cursor.jpg', 3)
) as seed (name, website_url, logo_path, sort_order)
where not exists (select 1 from public.partners);

-- The board's cards, with the photos in the board-photos bucket. A card is linked to a member
-- account by email when that member exists, and left unlinked otherwise: link it in Settings later.
insert into public.board_members
  (name, title, photo_path, linkedin_url, github_url, twitter_url, website_url, user_id, sort_order)
select seed.name, seed.title, seed.photo_path, seed.linkedin_url, seed.github_url, seed.twitter_url,
       seed.website_url, (select m.id from public.members m where m.email = seed.email), seed.sort_order
from (values
    ('Dean Lupini', 'President', 'dean.jpg', 'https://www.linkedin.com/in/dean-lupini-67608a22/', '', '', '', null, 0),
    ('Heather Dufour', 'Treasurer', 'heather.jpg', 'https://www.linkedin.com/in/heather-dufour/', '', '', '', null, 1),
    ('Hannan Max', 'Technical Lead', 'hannan.jpg', 'https://www.linkedin.com/in/hannanmax/', 'https://github.com/hannanmax/', '', 'https://hannanmax.com/', 'hannanmaxdev@gmail.com', 2),
    ('Athif', 'Secretary', 'athif.jpg', 'https://www.linkedin.com/in/athif-shaffy/', '', '', '', null, 3),
    ('Karan', 'Marketing', 'karan.jpg', 'https://www.linkedin.com/in/karan-tutlani/', '', '', '', 'karan@nodesudbury.com', 4),
    ('Cheick', 'Promotion / Sponsorship', 'cheick.jpg', 'https://www.linkedin.com/in/cheickismaelmaiga/', '', '', '', null, 5),
    ('Baljinder', 'Membership Leader', 'baljinder.jpg', 'https://www.linkedin.com/in/baljinder-maan/', '', '', '', null, 6),
    ('Hassan', 'AI and Emerging Technologies', 'hassan.jpg', 'https://www.linkedin.com/in/mshahriar/', '', '', '', null, 7)
) as seed (name, title, photo_path, linkedin_url, github_url, twitter_url, website_url, email, sort_order)
where not exists (select 1 from public.board_members);
