# NODE Website - Claude Instructions

## Project Overview

The NODE website: the Northern Ontario Dev Exchange site in Sudbury. Astro pages with Lit components, built to static HTML. Content comes from `packages/config`, sign-in and members come from Supabase, and events and open source data are synced from GDG, Luma and GitHub. Read [AGENTS.md](AGENTS.md) for the layout, commands and conventions, and [README.md](README.md) for how to run it.

The older Next.js and Framer site is kept in `archive/`. Do not change it unless asked.

## Dev Server

```bash
FIRESTORE_TARGET=sample NODE_ENV=development npm --prefix packages/web run start:astro
# Server at http://localhost:4321
```

Use Node 22 (`nvm use 22`). Restart the dev server after changing config, data or the list of pages.

## Git Branching Rules

- NEVER push directly to `main`. Main is protected and only accepts PRs from `dev`.
- Always create feature branches off `dev`, then PR into `dev`. Maintainer opens `dev` -> `main` for production.
- Branch flow: `git checkout dev` -> `git checkout -b feat/your-feature` -> PR to `dev`.
- Never force-push to any branch.

## Writing Rules (inherited from parent CLAUDE.md)

- NEVER use em-dashes (---) in any output. Use a regular hyphen or rewrite.
- NEVER include Claude session links in commit messages.
- NEVER push to `https://github.com/NODE-Sudbury/NODE-Sudbury.github.io` unless the user explicitly says "push" in that specific message.

## Secrets

- `.env*` files are gitignored. The Supabase URL and anon key are in `packages/web/.env.development` and `.env.production`, with the names `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Never use or commit the Supabase service role key in this site.
