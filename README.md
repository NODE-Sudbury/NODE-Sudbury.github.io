# NODE - Northern Ontario Dev Exchange

Official website for NODE Sudbury. Built with Next.js 14.

**Live site:** [node-sudbury.vercel.app](https://node-sudbury.vercel.app) *(custom domain coming soon)*
**Dev preview:** [node-sudbury-dev.vercel.app](https://node-sudbury-dev.vercel.app)

---

## Branch Structure

| Branch | Purpose | Auto-deploys to |
|--------|---------|-----------------|
| `main` | Production - protected | [node-sudbury.vercel.app](https://node-sudbury.vercel.app) |
| `dev`  | Staging - test here first | [node-sudbury-dev.vercel.app](https://node-sudbury-dev.vercel.app) |

**Rule:** `main` only accepts PRs from `dev`. Any PR from another branch is auto-closed.

---

## How to Contribute

NODE is open to community contributions. Everyone is welcome - you don't need to be a member to submit changes.

---

### Community members (fork-based)

#### 1. Fork the repo

Click **Fork** at the top right of the [GitHub repo](https://github.com/NODE-Sudbury/NODE-Sudbury.github.io) to create your own copy.

#### 2. Clone your fork

```bash
git clone https://github.com/YOUR-USERNAME/NODE-Sudbury.github.io.git
cd NODE-Sudbury.github.io
npm install
```

#### 3. Create a branch off `dev`

```bash
git checkout dev
git checkout -b feature/your-change
```

#### 4. Make your changes and run locally

```bash
npm run dev
# Open http://localhost:3000
```

#### 5. Push to your fork and open a PR

```bash
git push origin feature/your-change
```

Then go to GitHub and open a Pull Request from your fork's branch into `dev` on the main repo. A maintainer will review and merge it - once merged it auto-deploys to the dev preview.

---

### Core team members

Same flow but you can push branches directly without forking:

```bash
git clone https://github.com/NODE-Sudbury/NODE-Sudbury.github.io.git
cd NODE-Sudbury.github.io
git checkout dev && git pull origin dev
git checkout -b feature/your-change
# make changes
git push origin feature/your-change
```

Then open a PR on GitHub: `feature/your-change` → `dev`

---

### Promoting to production

Only maintainers open the final PR: `dev` → `main`. Once merged, it auto-deploys to production.

---

## PR Rules

- Feature branches → `dev` only
- `dev` → `main` only (no other branch can PR to main)
- PRs to `main` from any branch other than `dev` are auto-closed by the bot

---

## Local Dev Setup

**Requirements:** Node.js 18+, npm

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`.

---

## Tech Stack

- [Next.js 14](https://nextjs.org) - App Router
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel](https://vercel.com) - Hosting and preview deployments
