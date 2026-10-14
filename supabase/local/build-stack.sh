#!/usr/bin/env bash
# Puts a project folder for the local Supabase in supabase/.local-stack/: the baseline first, then the
# real migrations in order, the made-up seed and the config. `reset.sh` and the CI check both use it.

set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
stack="$root/supabase/.local-stack"
here="$root/supabase/local"

rm -rf "$stack"
mkdir -p "$stack/supabase/migrations"
cp "$here/config.toml" "$stack/supabase/config.toml"
cp "$here/seed.sql" "$stack/supabase/seed.sql"
cp "$here/baseline.sql" "$stack/supabase/migrations/00000000000000_baseline.sql"
cp "$root"/supabase/migrations/*.sql "$stack/supabase/migrations/"
echo "$stack"
