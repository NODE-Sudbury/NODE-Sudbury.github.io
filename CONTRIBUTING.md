# Contributing to NODE Sudbury

Thanks for wanting to contribute. NODE is a community-driven org and the site is open to everyone - no experience level required.

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

You don't need to be a NODE member to contribute.

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

### 5. Check your work

1. Run `npm run lint` and `npm test`, or at least the Vitest project and type check for what you changed. See [AGENTS.md](./AGENTS.md) for the commands and conventions.
2. Add a test for every feature or bug fix.
3. After changing text in `msg()`, run `npm --prefix packages/web run localize:extract` and commit `packages/translations/source/en.xlf`.
4. Use theme color tokens, never hex colors, outside `src/themes/`.

### 6. Push and open a PR into `dev`

```bash
git push origin feat/your-change
```

Open a PR on GitHub from your fork's branch into `dev`. A maintainer will review it. Once merged it auto-deploys to the dev site.

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

Open an issue and tag a maintainer, or reach out through the NODE community channels. You can also write to admin@nodesudbury.com.
