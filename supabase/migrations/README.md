# NODE Events Platform - Supabase Migrations

## Overview

Migrations `0001` through `0015` are the original MVP schema (members, events, rsvps, board, partners, etc.) and should already be applied to both environments.

Migrations `0016` through `0026` are the full platform schema - additive on top of 0001-0015. They add ~120 new tables across 6 domains without touching existing tables (except ALTER TABLE to add columns).

## Environments

| Env  | Connection String Env Var |
|------|--------------------------|
| DEV  | `SUPABASE_DEV_DB_URL` (see .env.local) |
| PROD | `SUPABASE_PROD_DB_URL` (see .env.local) |

Both are in `ca-central-1` (Canada Central).

## Applying 0016+ Migrations

Always apply to DEV first, verify, then apply to PROD.

```bash
# Apply to DEV (in order - do not skip or reorder)
for f in 0016_*.sql 0017_*.sql 0018_*.sql 0019_*.sql 0020_*.sql \
          0021_*.sql 0022_*.sql 0023_*.sql 0024_*.sql 0025_*.sql \
          0026_*.sql; do
  echo "Applying $f..."
  psql $SUPABASE_DEV_DB_URL -f "$f"
done

# After verifying on DEV, apply to PROD
for f in 0016_*.sql 0017_*.sql 0018_*.sql 0019_*.sql 0020_*.sql \
          0021_*.sql 0022_*.sql 0023_*.sql 0024_*.sql 0025_*.sql \
          0026_*.sql; do
  echo "Applying $f to PROD..."
  psql $SUPABASE_PROD_DB_URL -f "$f"
done
```

Or apply individually:

```bash
psql $SUPABASE_DEV_DB_URL -f 0016_enums_and_helpers.sql
psql $SUPABASE_DEV_DB_URL -f 0017_foundation_tables.sql
# ... and so on in order
```

## Rules

1. **Never skip a migration or apply out of order.** Each migration may depend on tables/types from the previous one.
2. **Never re-run 0001-0015.** Those are already applied to both environments. Re-running them will cause errors.
3. **0026_storage.sql must be run with the service_role key** (not the anon key) for the `storage.buckets` INSERT to succeed. Use the Supabase dashboard SQL editor with service_role, or set your connection string to use the service role.
4. **Migrations are idempotent where possible** - `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`, and `ON CONFLICT DO NOTHING` guards mean re-running a migration after a partial failure is safe in most cases.

## Migration Map

| File | Domain | What it does |
|------|--------|-------------|
| 0016_enums_and_helpers.sql | Foundation | 12 enum types, is_board(), touch_updated_at() |
| 0017_foundation_tables.sql | Foundation | chapters, locations, tags, tracks, sessions, templates; ALTER members/events/event_series |
| 0018_hackathon.sql | Hackathon | Teams, rounds, submissions, judging, CTF, awards |
| 0019_engagement.sql | Engagement | CFP, quiz, whiteboard, scavenger hunt, emoji, Q&A, polls |
| 0020_registration_extended.sql | Registration | ticket_types, registrations (full), stripe, referrals, invites |
| 0021_gamification.sql | Gamification | Badges, points, streaks, certificates, notifications, networking, mentorship |
| 0022_organizer.sql | Organizer | Volunteers, sponsors, moderation, audit_log, feature_flags |
| 0023_event_types_extended.sql | Events | Job fair, unconference, demo day, async windows, announcements |
| 0024_triggers.sql | Cross-domain | All trigger functions and CREATE TRIGGER statements |
| 0025_views.sql | Cross-domain | v_hackathon_leaderboard, v_ctf_leaderboard, v_volunteer_hours, v_member_leaderboard |
| 0026_storage.sql | Storage | 6 new buckets + RLS policies (needs service_role) |

## Notes

- The existing `rsvps` table is preserved. The new `registrations` table (0020) is a full-featured parallel system. The dashboard currently reads from `rsvps`; new event pages should use `registrations`.
- `members.role` remains a text column (not the enum type) for backwards compatibility with existing RLS policies. New tables use the enum types.
- `stripe_webhook_events` inserts from the Stripe Edge Function must use `SUPABASE_SERVICE_ROLE_KEY` - the anon key returns 403 from RLS.
- Ticket oversell prevention requires the `claim_ticket()` SECURITY DEFINER function (not yet written) to use `SELECT FOR UPDATE` on ticket_types - do not rely on application-layer checks for this.
