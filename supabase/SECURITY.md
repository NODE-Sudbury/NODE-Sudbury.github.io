# Database security

How the Supabase projects are protected, how to check it, and what has to be set in the dashboard.

## How it works

The site talks to Supabase from the browser with the public (`anon`) key, which anyone can read. So the database itself decides what each caller may do, and the site's checks are only for convenience.

- **Row level security** is on for every table. A table gets no access for visitors or members unless a policy or a grant gives it.
- **Grants** are narrow. `anon` and `authenticated` start with nothing on new tables (default privileges are revoked), and each migration grants exactly what is needed. Members can change only their own profile columns, never their role, flags, email or id.
- **Admin roles** live in the `admins` table: one super admin, then dashboard admins and check-in volunteers. The super admin row can't be changed or deleted, and only the super admin adds dashboard admins. Admins add volunteers. Policies call `current_admin_role()`.
- **The activity log** (`audit_log`) records every add, change and delete in the admin tables, with who did it, their role and their address. Triggers write it, nobody can edit or delete it, and only the super admin can read it.
- **Public data** is limited to what the site shows: partners, sponsors and the board's cards. A public profile is returned one at a time by `get_public_profile()`, never as a list, and the view behind it is not readable directly.
- **Rate limits** cut off callers who ask too often: 60 profile lookups a minute per address, 30 handle checks a minute per member, and 10 subscribes or unsubscribes an hour per address. Over the limit, the answer is quietly empty, because an error would undo the count.
- **Page views** keep only a page's address and the day as a count: no cookies, no visitor addresses. Every page reports itself from the shared layout. A report is dropped unless the address looks like a page of the site, a caller can send only 120 a minute, and a day keeps at most 2000 different addresses, so made-up addresses cannot fill the table. Visitors who send Do Not Track or Global Privacy Control are not counted, and neither are the admin and account pages.
- **Storage**: the buckets are public by link but nobody can list them. Only admins write to the logo and photo buckets, a member writes only to their own folder in `avatars`, and SVG files are not accepted.

## Checking it

`supabase/tests/security.sql` checks what a visitor, a member, a volunteer, an admin and the super admin can read and write, that the log can't be changed and that the limiter works. It changes nothing: everything is rolled back.

```console
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
```

Run it after every migration, and on production after a launch. It needs a super admin and at least one other member.

## Production

`supabase/hotfixes/20261014_lock_down_members.sql` closes the worst holes on a database that only has the early schema. It was run on production on 2026-10-14, after a backup and a dry run that was rolled back. It also creates the `avatars` bucket and its rules, which were set up by hand on development and are in no other migration.

At launch, run migrations 0006 to 0016 on production in order, then the security script. Migration 0015 can run on top of the hotfix, because it is safe to run twice.

## Settings only the dashboard can change

These are not in SQL, so they are set in the Supabase dashboard, for both projects:

- **Authentication, Rate limits**: keep the sign-in and email limits on. The email limit stops someone from using the site to send mail to others.
- **Authentication, Sessions**: access token (JWT) expiry at 3600 seconds or less, and refresh token rotation on, with reuse detection.
- **Authentication, URL configuration**: the redirect list holds only the real site addresses (production, dev and localhost), with no wildcards beyond the path.
- **Authentication, Attack protection**: turn on CAPTCHA (Turnstile) once real traffic arrives, which stops bots from signing up and from using the subscribe form.
- **API settings**: the maximum rows per request, which is set to 1000 on development.
- **Never** put the service role key in the site, a `.env` file that is committed, or a build setting that reaches the browser.

## Known limits

- Anyone can unsubscribe or subscribe any email address, because there is no email sending to confirm it yet. The limits above slow abuse down. Once emails go out, each subscriber should get a private link, and a new subscription should need a confirming click.
- The public tables (partners, sponsors, board cards) can be read in full by anyone, on purpose. They hold only what the site shows.
- Per-address limits depend on the address the gateway reports. Behind a shared network (a school or a company), many people share one address.
