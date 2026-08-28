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

## Contributing

NODE is open to everyone. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide - fork flow for community members, direct push for core team, and PR rules.

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
