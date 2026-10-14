# Contributing to NODE Sudbury

Thanks for wanting to contribute. NODE is a community-driven org and the site is open to everyone - no experience level required.

---

## Branch structure

| Branch | Purpose | Auto-deploys to |
|--------|---------|-----------------|
| `main` | Production - protected | [node-sudbury.vercel.app](https://node-sudbury.vercel.app) |
| `dev` | Staging - test here first | [node-sudbury-dev.vercel.app](https://node-sudbury-dev.vercel.app) |

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
npm install
```

### 3. Branch off `dev`

```bash
git checkout dev
git checkout -b feature/your-change
```

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Push and open a PR into `dev`

```bash
git push origin feature/your-change
```

Open a PR on GitHub from your fork's branch into `dev`. A maintainer will review it. Once merged it auto-deploys to the dev preview URL.

---

## Core team members

Same flow but without forking - push directly to the repo.

```bash
git clone https://github.com/NODE-Sudbury/NODE-Sudbury.github.io.git
cd NODE-Sudbury.github.io
git checkout dev && git pull origin dev
git checkout -b feature/your-change
# make changes
git push origin feature/your-change
```

Open a PR: `feature/your-change` -> `dev`

---

## Promoting to production

Only maintainers open the final PR: `dev` -> `main`. Once merged it auto-deploys to production.

---

## Security - no secrets in code

This repo has GitHub push protection enabled. If you accidentally include an API key, token, or any credential in a commit, the push will be blocked automatically before it reaches GitHub.

Never hardcode secrets. Use environment variables and add them through the Vercel dashboard or ask a maintainer.

---

## Opening an issue

Found a bug or have a feature idea? Open an issue:

- **Feature Request** - new functionality or improvement
- **Bug Report** - something broken
- **Content Update** - text, image, or copy change

---

## Questions?

Open an issue and tag a maintainer, or reach out through the NODE community channels.
