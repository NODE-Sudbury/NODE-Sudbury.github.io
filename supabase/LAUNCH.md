# Taking the database live

What has to happen to the production Supabase project (`Node Website`) when `dev` goes to `main`. Development (`Node Website Dev`) already has all of it. Do these in order, before the production deploy, so the first production build already reads the database.

## What moves, and what does not

| What                                                        | Moves how                                           |
| ----------------------------------------------------------- | --------------------------------------------------- |
| Tables, rules, functions and buckets (migrations 0006-0017) | `supabase/migrations/`, in order                    |
| You as the super admin                                      | `supabase/seed/launch.sql`, found by email          |
| The 4 partners                                              | `supabase/seed/launch.sql`                          |
| The 8 board cards (yours linked to your account)            | `supabase/seed/launch.sql`                          |
| The 4 partner logos and 8 board photos (files)              | `supabase/seed/upload-images.mjs`                   |
| The API row limit (1000)                                    | `supabase/seed/launch.sql`                          |
| Dashboard settings (sign-in limits, token life, CAPTCHA)    | By hand, see `SECURITY.md`                          |
| Members                                                     | Does not move: people sign in and join on their own |
| Subscribers, activity log, page counts                      | Does not move: development holds only test data     |
| Sponsors                                                    | None yet: add them in the dashboard                 |

## Order

1. **Back up production.** `pg_dump "$SUPABASE_PROD_DB_URL" --schema=public --no-owner --no-privileges -f backup.sql`.
2. **Make sure you have signed in once on the production site**, so your account is a member. The seed finds you by `hannanmaxdev@gmail.com`.
3. **Run the migrations 0006 to 0017** from `supabase/migrations/`, each with `psql "$SUPABASE_PROD_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f <file>`. The hotfix in `supabase/hotfixes/` was already run, and the migrations are safe on top of it.
4. **Run the seed:** `psql "$SUPABASE_PROD_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f supabase/seed/launch.sql`.
5. **Upload the images** with `supabase/seed/upload-images.mjs`. It needs your access token from the production site; the steps are at the top of the file.
6. **Run the security checks:** `psql "$SUPABASE_PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql`. It changes nothing. With only one member it skips the checks that need a second one.
7. **Settings in the Supabase dashboard** (production project): the redirect addresses (`https://nodesudbury.com/**` and `https://www.nodesudbury.com/**`), token life, refresh token reuse detection, sign-in limits. See `SECURITY.md`.
8. **Check Vercel**: the Production environment has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the production project, and Preview has them for the development project. Both are there today.
9. **Open the pull request from `dev` to `main`**, merge it, and wait for the deploy.
10. **After the deploy:** open `nodesudbury.com/team` and the home page, check the board and partners, sign in, open `/admin`, and set your handle and profile at `/account`.

## After launch

- **Remove the secrets the new site does not use from Vercel**, once the old site is gone. Both Production and Preview hold `SUPABASE_SERVICE_ROLE_KEY`, and Production also holds `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`, `POSTGRES_PASSWORD` and the other `POSTGRES_*` values, and `RESEND_API_KEY`. They come from the old site and are not exposed to the browser, because only names starting with `NEXT_PUBLIC_` are. But a build can read them, so the fewer there are, the less a mistake can leak. Remove them in Vercel, Settings, Environment Variables. Rotate any of them that was ever pasted somewhere public.

- The public pages are built ahead of time, so a change to a board card or a partner shows after the next deploy.
- Link the other board cards to their members in Settings, Boards, when those people have signed in.
- Run `supabase/tests/security.sql` again after every migration.
