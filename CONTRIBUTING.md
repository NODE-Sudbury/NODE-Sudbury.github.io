# Contributing to N.O.D.E. Sudbury

Thanks for wanting to contribute. N.O.D.E. is a community-driven org and the site is open to everyone - no experience level required.

---

## Branch structure

| Branch | Purpose                   | Auto-deploys to                                    |
| ------ | ------------------------- | -------------------------------------------------- |
| `main` | Production - protected    | [nodesudbury.com](https://nodesudbury.com)         |
| `dev`  | Staging - test here first | [dev.nodesudbury.com](https://dev.nodesudbury.com) |

- All feature work goes into `dev`
- `main` only accepts PRs from `dev` - any PR from another branch is auto-closed by the bot
- Only maintainers promote `dev` to `main`

---

## Community contributors (fork-based)

You don't need to be a N.O.D.E. member to contribute.

### 1. Fork the repo

Click **Fork** at the top right of the [GitHub repo](https://github.com/NODE-Sudbury/NODE-Sudbury.github.io).

### 2. Clone your fork

```bash
git clone https://github.com/YOUR-USERNAME/NODE-Sudbury.github.io.git
cd NODE-Sudbury.github.io
npm ci
```

You need Node.js 22.

### 3. Branch off `dev`

```bash
git checkout dev
git checkout -b feat/your-change
```

### 4. Run locally

```bash
FIRESTORE_TARGET=sample NODE_ENV=development npm --prefix packages/web run start:astro
# Open http://localhost:4321
```

You do not need any keys for this. The site runs from its sample data, and the parts that need an account (sign-in, member profiles, the admin dashboard) stay off.

#### Work on accounts, profiles or the admin dashboard

Run your own private database. It has made-up people, partners and board cards, and you can break and rebuild it as often as you like. It needs [Docker](https://www.docker.com/products/docker-desktop/) running and the [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`).

```bash
npm run db:local
NODE_ENV=development npm --prefix packages/web run start:astro
```

The first command builds the database from the migrations in `supabase/migrations/` and writes its address and public key to `packages/web/.env.development.local`, which git ignores. Sign in with any email address and read the email at http://127.0.0.1:54324. Sign in as `admin@example.test` to see the admin dashboard as the super admin. Run the command again for a clean start, and delete that file to go back to sample mode.

Changing the database? Add a new file to `supabase/migrations/`, never edit an old one. A pull request that drops or truncates something, changes roles, grants access to `anon` or the service role, turns off row level security or adds a `security definer` function fails a check until a maintainer reads it. That is on purpose. Run `supabase/tests/security.sql` against your local database before you open it.

#### What you will not be given

Nobody outside the maintainers has the keys of the real projects, and you never need them: the shared development and production databases, the service role key, database passwords, the JWT secret, deploy hooks, and the Vercel and GitHub tokens. If something seems to need one, ask in the pull request or on Discord. The two values a site build reads (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are public by design, and the database rules decide what they can do.

### 5. Check your work

1. Run `npm run lint`, then `npx vitest run --project web` and `npx vitest run --project Hydration`, or at least the tests and type check for what you changed. These are the checks that run on every pull request. See [AGENTS.md](./AGENTS.md) for the commands and conventions.
2. Add a test for every feature or bug fix.
3. After changing text in `msg()`, run `npm --prefix packages/web run localize:extract` and commit `packages/translations/source/en.xlf`.
4. Use theme color tokens, never hex colors, outside `src/themes/`.

### 6. Push and open a PR into `dev`

```bash
git push origin feat/your-change
```

Open a PR on GitHub from your fork's branch into `dev`. Checks run on it automatically, and a maintainer will review it. Changes to `supabase/`, `.github/`, `vercel.json`, the package files and the build files need a maintainer's approval. Once merged it auto-deploys to the dev site.

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and PR titles: `feat: add an events page`, `fix: show the right time zone`, `docs: describe the sitemap`. Say what changed and why in plain words.

---

## Core team members

Same flow but without forking - push your branch to the repo.

```bash
git clone https://github.com/NODE-Sudbury/NODE-Sudbury.github.io.git
cd NODE-Sudbury.github.io
git checkout dev && git pull origin dev
git checkout -b feat/your-change
# make changes
git push origin feat/your-change
```

Open a PR: `feat/your-change` -> `dev`

---

## Promoting to production

Only maintainers open the final PR: `dev` -> `main`. Once merged it auto-deploys to production.

---

## Security - no secrets in code

This repo has GitHub push protection enabled. If you accidentally include an API key, token, or any credential in a commit, the push will be blocked automatically before it reaches GitHub.

Never hardcode secrets. Use environment variables, keep `.env` files out of commits, and never use the Supabase service role key in the site. Ask a maintainer to add keys to the Vercel dashboard. To report a security problem, see [SECURITY.md](./SECURITY.md).

---

## Opening an issue

Found a bug or have a feature idea? Open an issue:

- **Feature Request** - new functionality or improvement
- **Bug Report** - something broken, with what you expected, what happened, the steps to reproduce it and your browser
- **Content Update** - text, image, or copy change

---

## Questions?

Open an issue and tag a maintainer, or reach out through the N.O.D.E. community channels. You can also write to admin@nodesudbury.com.
