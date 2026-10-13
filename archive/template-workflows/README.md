# Workflows kept from the website template

These are the GitHub Actions, issue templates and Dependabot settings the website started from. They are for a Firebase-hosted conference site, so they are kept here, switched off, instead of in `.github/`.

To use one, copy it to `.github/workflows/` and change it for NODE first. They need Firebase secrets and a Firebase project that NODE does not have. Dependabot opens its pull requests against `main` unless `target-branch: dev` is set, and `main` only accepts pull requests from `dev`.
