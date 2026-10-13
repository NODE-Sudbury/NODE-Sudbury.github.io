# Database structure

What is in the Supabase projects today, what the new website uses, and the structure to grow into. The counts are from the development project, `Node Website Dev`, on October 13, 2026. Production, `Node Website`, has only the first nine migrations: 9 tables and no members.

## The members table

One row per person, made automatically when someone first signs in (a trigger on `auth.users`). The primary key `id` is the same as their sign-in account id. 79 other tables point at it.

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

**A known leak, not fixed yet.** The original policies `members_select_active` and "Public profiles are viewable by anyone" let anyone with the public key read every column, including email and role. `migrations/20261014000002_hide_member_emails.sql` closes it. Run it on development first.

## Related to members

| Name                                             | Kind     | What it is                                                                     |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| `auth.users`, `auth.identities`                  | Supabase | The sign-ins. Google and email links. Managed by Supabase, not edited by us.   |
| `public_profiles`                                | view     | What the public sees: public and active members, without email or role.        |
| `avatars`                                        | storage  | Public bucket. A member can write only under their own folder, `<member id>/`. |
| `member_onboarding_state`                        | table    | The old onboarding wizard's progress. Not used by the new site.                |
| `chapters`                                       | table    | Local chapters (2 rows).                                                       |
| `member_badges`, `member_points`, `point_events` | tables   | The old points and badges system. Empty.                                       |

## The 129 tables

Only 16 have any data. All of them came from the old Next.js site's dashboard and admin, which is in `archive/`.

**With data:**

| Table                                                                                                       | Rows                 | Verdict                                                                                   |
| ----------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| `members`                                                                                                   | 2                    | Keep. The core table.                                                                     |
| `chapters`                                                                                                  | 2                    | Keep if chapters stay a concept.                                                          |
| `events`, `event_series`, `event_locations`, `event_tags`, `event_tag_links`, `ticket_types`, `promo_codes` | 5, 2, 3, 10, 4, 3, 1 | Old event system. The new site syncs events from GDG and Luma instead. Delete candidates. |
| `board_members`, `partners`                                                                                 | 2, 3                 | The new site keeps these in its own content files. Delete candidates.                     |
| `member_onboarding_state`, `badge_definitions`, `feature_flags`, `settings`, `api_keys`                     | 2, 5, 5, 1, 2        | Old app internals. Delete candidates.                                                     |

**Empty (113 tables), by area:** event operations (`event_*`: announcements, check-in sessions, interests, invites, rooms, sessions, speakers, sponsors, templates, tracks), live polls and Q&A (`live_*`), hackathons and judging (`hackathon_*`, `judging_*`), quizzes (`quiz_*`), mentoring (`mentor_*`), session bookmarks, ratings and RSVPs (`session_*`), CTF, game jam, scavenger hunt, job fair, volunteers, certificates, awards, networking, notifications, referrals, payments, moderation and more.

None of the empty tables is used by the new site.

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
