## Contributing to the NODE website

The NODE website is built in the open, and anyone is welcome to help. You don't need to be a NODE member.

### Branches

- `main` is production and protected. It only accepts pull requests from `dev`.
- `dev` is staging. Work for the site goes into `dev` first.
- Branch off `dev` (`feat/your-change`), push it, and open a pull request into `dev`. Maintainers promote `dev` to `main`.

### Before you open a pull request

1. Run `npm run lint` and `npm test`, or at least the Vitest project and type check for what you changed. See [AGENTS.md](../AGENTS.md) for the commands and conventions.
2. Add a test for every feature or bug fix.
3. After changing text in `msg()`, run `npm --prefix packages/web run localize:extract` and commit `packages/translations/source/en.xlf`.
4. Use theme color tokens, never hex colors, outside `src/themes/`.
5. Keep keys out of the code: no `.env` files, API keys or service role keys.

### Commit messages and pull request titles

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat: add an events page`, `fix: show the right time zone`, `docs: describe the sitemap`. Say what changed and why in plain words.

### Filing issues

For a bug, tell us what you expected, what happened, the steps to reproduce it and your browser. For a feature, tell us who it is for and what they want to do.

### Conduct

Everyone taking part follows the [Code of Conduct](./CODE_OF_CONDUCT.md). Report problems to admin@nodesudbury.com.
