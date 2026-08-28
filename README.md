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

### 1. Clone the repo

```bash
git clone https://github.com/NODE-Sudbury/NODE-Sudbury.github.io.git
cd NODE-Sudbury.github.io
npm install
```

### 2. Create a feature branch off `dev`

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

### 3. Make your changes and run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 4. Push and open a PR to `dev`

```bash
git push origin feature/your-feature-name
```

Then open a PR on GitHub: `feature/your-feature-name` → `dev`

### 5. Test on the dev preview URL

Once merged to `dev`, your changes auto-deploy to the dev preview URL. Share it with the team for review.

### 6. Promoting to production

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
