#!/usr/bin/env bash
# Builds a private Supabase on your own computer, with made-up data, and points the site at it.
#
#   npm run db:local
#
# It needs Docker running and the Supabase CLI (`brew install supabase/tap/supabase`). Run it again
# whenever you want a clean database: it deletes everything in the local one and rebuilds it from
# the migrations. It never talks to the real projects.

set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
here="$root/supabase/local"

command -v supabase >/dev/null || { echo "Install the Supabase CLI first: brew install supabase/tap/supabase"; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is not running. Start Docker Desktop, then run this again."; exit 1; }

# A project folder that only this script uses: the baseline first, then the real migrations in order.
stack="$(bash "$here/build-stack.sh")"

supabase start --workdir "$stack"
supabase db reset --local --yes --workdir "$stack"

# The address and the public key of the local project go in a file that git ignores, which the site
# reads before `.env.development`.
eval "$(supabase status --workdir "$stack" -o env | grep -E '^(API_URL|ANON_KEY)=')"
cat > "$root/packages/web/.env.development.local" <<ENV
# Written by supabase/local/reset.sh. It points the site at the private database on this computer.
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
ENV

cat <<DONE

The local database is ready, with made-up people, partners and board cards.

  Start the site:  NODE_ENV=development npm --prefix packages/web run start:astro
  Sign in:         use any made-up address, then read the email at http://127.0.0.1:54324
  Admin dashboard: sign in as admin@example.test, you are its super admin
  Database editor: http://127.0.0.1:54323

Delete the file packages/web/.env.development.local to point the site back at the shared one.
DONE
