# Contributing to NODE Sudbury

Thanks for wanting to contribute. NODE is a community-driven org and the site is open to everyone - no experience level required.

---

## Branch structure

| Branch | Purpose | URL |
|--------|---------|-----|
| `main` | Production - protected | [node-sudbury.vercel.app](https://node-sudbury.vercel.app) |
| `dev` | Staging - test here first | [node-sudbury-dev.vercel.app](https://node-sudbury-dev.vercel.app) |

**Rule:** PRs to `main` only come from `dev`. Any PR from another branch is auto-closed by the bot.

---

## Community contributors (fork-based)

You don't need to be a NODE member to contribute. Fork the repo and open a PR.

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

Go to GitHub and open a PR from your fork's branch into `dev` on the main repo. A maintainer will review it. Once merged it auto-deploys to the dev preview URL.

---

## Core team members

Same flow but you can push branches directly without forking.

```bash
git clone https://github.com/NODE-Sudbury/NODE-Sudbury.github.io.git
cd NODE-Sudbury.github.io
git checkout dev && git pull origin dev
git checkout -b feature/your-change
# make changes
git push origin feature/your-change
```

Open a PR on GitHub: `feature/your-change` → `dev`

---

## Promoting to production

Only maintainers open the final PR: `dev` → `main`. Once merged it auto-deploys to production.

---

## Opening an issue

Found a bug? Have a feature idea? Want to request a content change?

Use the issue templates at [github.com/NODE-Sudbury/NODE-Sudbury.github.io/issues/new/choose](https://github.com/NODE-Sudbury/NODE-Sudbury.github.io/issues/new/choose)

- **Feature Request** - new functionality or improvement
- **Bug Report** - something broken or not working
- **Content Update** - text, image, or copy change

---

## Questions?

Join the NODE Discord or open an issue and tag a maintainer.
