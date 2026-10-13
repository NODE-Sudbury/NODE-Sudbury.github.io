# Supabase

The website's database changes. Two Supabase projects serve the site: `Node Website Dev` (ref `rakulrveqisxlcuqxzzw`) for development and previews, and `Node Website` (ref `cfqeyjsfmrnfanitxcso`) for production.

Migrations here are plain SQL, named `<timestamp>_<name>.sql`, and written to be safe to run again. Apply one to the development project first, check the site, then to production. The projects were migrated by hand with `psql` (the history table does not list every change), so apply with `psql` too:

```console
psql "$SUPABASE_DEV_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/<file>.sql
```

The connection strings and passwords live in a gitignored env file, never in the repository.

## Migrations

| File                                    | Does                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `20261014000001_member_profiles.sql`    | Adds the member `handle`, a `public_profiles` view that never shows email or role, and a guard on who can set a role. |
| `20261014000002_hide_member_emails.sql` | Closes the leak that lets the public key read every member's email. Not additive.                                     |
| `20261014000003_exclusive_members.sql`  | Adds `is_exclusive_member` (only the board can change it) and the member id to the public view.                       |

The structure of the tables is in [SCHEMA.md](./SCHEMA.md).
