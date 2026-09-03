# Security Policy

## Reporting a vulnerability

If you find a security vulnerability in this repository, please do **not** open a public GitHub issue.

Report it privately by emailing: **hello@nodesudbury.com**

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact

We will respond within 48 hours and work to resolve it promptly.

## Accidental secret exposure

If you accidentally commit an API key, token, or credential to this repo:

1. Rotate the key immediately in the relevant service (Google Cloud, Supabase, Stripe, etc.)
2. Open a private report to hello@nodesudbury.com
3. A maintainer will scrub the history and force-push

This repo has GitHub push protection enabled - it will block pushes containing known secret patterns before they reach GitHub.
