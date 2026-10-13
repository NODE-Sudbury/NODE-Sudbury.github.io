# Security policy

## Reporting a vulnerability

Report vulnerabilities privately by emailing **admin@nodesudbury.com**. Do not open a public issue or pull request.

Include what is affected, how to reproduce it, and the impact you expect. NODE is run by volunteers, so replies can take a few days.

## Secrets

Never commit credentials. The Supabase keys for this site live in gitignored `.env.development` and `.env.production` files in `packages/web`, and in the host's environment settings. If a key reaches the repository by mistake, rotate it in Supabase first, then tell admin@nodesudbury.com.

The site's own contact for security reports is also published at `/.well-known/security.txt`.
