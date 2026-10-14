# Database structure

What is in the two Supabase projects, and how it grows. On October 13, 2026 both `Node Website Dev` and `Node Website` (production) were cleaned to the same starting point: the old dashboard's 128 other tables were dropped, and the new site's backend starts from the `members` table.

## The members table

One row per person, made automatically when someone first signs in (a trigger on `auth.users`). The primary key `id` is the same as their sign-in account id.

| Column                                                     | Type        | Default        | What it is                                                                                |
| ---------------------------------------------------------- | ----------- | -------------- | ----------------------------------------------------------------------------------------- |
| `id`                                                       | uuid        |                | The sign-in account id. Never changes.                                                    |
| `email`                                                    | text        |                | Taken from the sign-in. Private: never shown on any page.                                 |
| `full_name`                                                | text        |                | Display name. Google fills it in on the first sign-in.                                    |
| `avatar_url`                                               | text        |                | Photo. Google's at first, or the one the member uploads to the `avatars` bucket.          |
| `handle`                                                   | text        |                | Their public address: `/members/<handle>`. 3 to 30 lowercase letters, digits and hyphens. |
| `member_type`                                              | text        | `professional` | `professional` or `student`.                                                              |
| `job_title`, `company`                                     | text        |                | For a professional.                                                                       |
| `school`, `program`                                        | text        |                | For a student.                                                                            |
| `bio`                                                      | text        |                | A few lines about themselves.                                                             |
| `pronouns`                                                 | text        |                |                                                                                           |
| `skills`                                                   | text[]      |                | Not edited on the site yet.                                                               |
| `linkedin_url`, `github_url`, `twitter_url`, `website_url` | text        |                | Links, as full addresses.                                                                 |
| `discord_tag`                                              | text        |                | Not a link, so it is not shown publicly yet.                                              |
| `is_public`                                                | boolean     | `true`         | Whether their profile page is visible to everyone.                                        |
| `is_active`                                                | boolean     | `true`         | Switched off by the board to hide a member everywhere. Members cannot change it.          |
| `is_exclusive_member`                                      | boolean     | `false`        | Exclusive membership. Only the board can change it.                                       |
| `role`                                                     | text        | `member`       | `member`, `staff` or `board`. Only the board can change it.                               |
| `is_super_admin`                                           | boolean     | `false`        | Protects the board from being changed by other board members.                             |
| `chapter_id`                                               | uuid        |                | Which chapter they belong to (`chapters`).                                                |
| `total_points`                                             | integer     | `0`            | From the old points system. Not used by the new site.                                     |
| `created_at`, `updated_at`                                 | timestamptz | `now()`        | "Member since" is `created_at`.                                                           |

**Who can read and change it.** A member reads and edits their own row. The board reads all rows. Only the board can change `role`, `is_super_admin`, `is_active`, `is_exclusive_member`, `email` and `id` (a trigger enforces it). The public reads members only through the `public_profiles` view, which has no email and no role.

**Email privacy.** The old policies that let anyone with the public key read every column were dropped (`20261014000002_hide_member_emails.sql`). Now the public key reads nothing from `members`.

## What else is in the database

| Name                            | Kind     | What it is                                                                                                                    |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `auth.users`, `auth.identities` | Supabase | The sign-ins: Google and email links. Managed by Supabase, not edited by us.                                                  |
| `sponsors`                      | table    | The sponsors of NODE, each with a tier. Anyone reads; only admins write. Each logo is a file in `sponsor-logos`.              |
| `sponsor-logos`                 | storage  | Public bucket for the sponsors' logos. Only the super admin and admins can upload.                                            |
| `board_members`                 | table    | The board's cards: name, title, photo and links, each optionally linked to a member account. Anyone reads; only admins write. |
| `board-photos`                  | storage  | Public bucket for the board photos. Only the super admin and admins can upload.                                               |
| `partners`                      | table    | The organizations NODE works with. Anyone reads; only admins write. Each logo is a file in `partner-logos`.                   |
| `partner-logos`                 | storage  | Public bucket for the partners' logos. Only the super admin and admins can upload.                                            |
| `admins`                        | table    | Who runs the site: one super admin, then admins and check-in volunteers. Only the super admin changes it.                     |
| `subscribers`                   | table    | Emails from the home page's subscribe form. Anyone can add one; only the board can read the list.                             |
| `public_profiles`               | view     | What the public sees: public, active members, without email or role.                                                          |
| `avatars`                       | storage  | Public bucket. A member can write only under their own folder, `<member id>/`.                                                |
| `current_admin_role()`          | function | The signed-in member's admin role, or nothing. Used by the admin policies and the site.                                       |
| `handle_available(text)`        | function | Whether a handle is free, for signed-in members. Counts private profiles, says no more.                                       |
| `handle_new_user()`             | function | Makes the `members` row when someone first signs in.                                                                          |
| `members_guard_columns()`       | function | Stops members changing their own role, exclusive flag, active flag, email or id.                                              |
| `current_user_role()`           | function | The signed-in member's role, used by the board's policies.                                                                    |
| `set_updated_at()`              | function | Keeps `updated_at` current.                                                                                                   |

Everything else that was in the old dashboard's database was dropped. A backup of both projects from before the clean-up is on Hannan's computer, not in this repository.

## Structure for the new site

Rules to keep it simple as it grows:

1. **`members` stays one narrow table**: who someone is, their public profile and a few flags. Anything that has many rows per person gets its own table, with `member_id uuid references members(id) on delete cascade`.
2. **Every table has row level security on, from the start.** The public reads through views that leave out private columns. A member reads and writes only their own rows. The board reads everything.
3. **Only the board changes status fields** (`role`, `is_exclusive_member`, `is_active`), enforced by a trigger, not by the page.
4. **Migrations are plain SQL in `supabase/migrations`**, safe to run again, applied to development first and production second.

Tables to add as the features that used Firebase come back:

| Feature                         | Table                    | Columns, roughly                                                                                                |
| ------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| My Schedule                     | `event_bookmarks`        | `member_id`, `event_slug`, `created_at`                                                                         |
| Feedback on sessions            | `event_feedback`         | `member_id`, `event_slug`, `rating`, `comment`, `created_at`                                                    |
| Reactions                       | `event_reactions`        | `member_id`, `event_slug`, `emoji`                                                                              |
| Newsletter                      | `newsletter_subscribers` | `email`, `member_id` (optional), `subscribed_at`, `unsubscribed_at`                                             |
| Membership (when payments come) | `memberships`            | `member_id`, `plan`, `status`, `started_at`, `expires_at`, `payment_ref`; `is_exclusive_member` follows from it |
| Event sign-ups                  | `event_registrations`    | `member_id`, `event_slug`, `status`, `created_at`                                                               |

Events are identified by their slug (`devfest-sudbury-2026`), because the events themselves come from GDG and Luma and are not stored in the database.
