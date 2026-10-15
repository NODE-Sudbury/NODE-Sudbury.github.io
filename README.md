# N.O.D.E. - Northern Ontario Dev Exchange

Official website for N.O.D.E. Sudbury - a community-driven tech org based in Greater Sudbury, Ontario: events, board, blog, membership, partners and the open source projects of the NODE-Sudbury organization.

**Live site:** [nodesudbury.com](https://nodesudbury.com)
**Dev site:** [dev.nodesudbury.com](https://dev.nodesudbury.com)

## Tech stack

- [Astro](https://astro.build) and [Lit](https://lit.dev) - static pages with web components
- [Supabase](https://supabase.com) - sign-in, members and subscribers
- [Vercel](https://vercel.com) - hosting and preview deployments

## Contributing

N.O.D.E. is open to everyone - no experience level required. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get started.

## Run it

Needs Node.js 22.

```console
npm ci
FIRESTORE_TARGET=sample NODE_ENV=development npm --prefix packages/web run start:astro
```

The site opens at http://localhost:4321 and reads its content from `packages/config`.

## Where things are

| Path                             | What it holds                                                 |
| -------------------------------- | ------------------------------------------------------------- |
| `packages/config/site.json`      | Site settings, navigation and features                        |
| `packages/config/content/`       | Home page text, FAQ, code of conduct and the open source data |
| `packages/config/sample-data/`   | Board, partners, gallery, blog, events and membership         |
| `packages/config/public/images/` | Logos and photos                                              |
| `packages/web/`                  | The website itself                                            |

## Sign-in and the two Supabase projects

Members sign in with an emailed link or Google, through Supabase. The site talks to one of two Supabase projects, chosen by the env file Vite reads:

| Command         | Env file                        | Supabase project   |
| --------------- | ------------------------------- | ------------------ |
| `npm start`     | `packages/web/.env.development` | `Node Website Dev` |
| `npm run build` | `packages/web/.env.production`  | `Node Website`     |

Copy `packages/web/.env.example` to both files and fill in each project's URL and public anon key (Project Settings, API). The files are gitignored. Never put the service role key in them. Each project must list the site's address under Authentication, URL Configuration, for example `http://localhost:4321/**` for development, or sign-in sends members to the project's default Site URL instead.

## Open source data

The Open Source page lists the public repositories of the organization, with contributors and activity. The numbers come from GitHub and count the commits on each repository's default branch (`main`), so work on `dev` counts once it is released to `main`.

### How it stays current

- **Every day** (about 09:17 UTC) the workflow `.github/workflows/refresh-open-source.yml` reads the data from GitHub with its own token, publishes it and the contributors' avatars on the `open-source-data` branch, and asks Vercel for a new build. The repository secret `SITE_DEPLOY_HOOK_URL` is the address that starts the build.
- **Every build** also asks GitHub itself (`SYNC_GITHUB=1` is in the build command). That often fails, because a build has no token: GitHub allows 60 requests an hour for an address, and the host's builders share addresses, so GitHub refuses the build. The build then takes the data published on the `open-source-data` branch, if it is newer than what the build has, and otherwise keeps the data saved in the repository. This is why the page once showed numbers from weeks before.
- **A new commit** shows on the page after it reaches `main`, and after the next daily run or any other build.

### Refreshing it now

Run the workflow, which reads GitHub, publishes the data and starts a build (about 3 minutes):

```console
gh workflow run refresh-open-source.yml
```

Or read GitHub from your own computer, which writes `packages/config/content/open-source.json` and the avatars for you to review and commit:

```console
npm --prefix packages/web run sync:github
```

Set `GITHUB_TOKEN` for a higher rate limit. Building with `SYNC_GITHUB=1` refreshes the data first.

### If the numbers look old

Check the `generatedAt` time at the top of the published file, `https://raw.githubusercontent.com/NODE-Sudbury/NODE-Sudbury.github.io/open-source-data/open-source.json`, and the run history of the workflow with `gh run list --workflow refresh-open-source.yml`. The build log says "Using the open source data that the daily workflow published" when it took the published data, and "Keeping the open source data from the last successful sync" when it had nothing newer.

## Events

The Events page and each event's own page come from the event links in `packages/config/content/event-sources.json`. Add a GDG (`gdg.community.dev`) or Luma (`luma.com`) link there with its category, then run `npm --prefix packages/web run sync:events`. The sync reads the public details of each page: description, address, tags, ticket types and the sign-up count. Building with `SYNC_EVENTS=1` refreshes them first, and the same daily workflow keeps the numbers current.

## License

Free to use and contribute to. Commercial use is not permitted. See [LICENSE](./LICENSE) for details.

## Search engines and sharing

Every page carries what search engines and link previews read:

- A unique title and description, a canonical link, Open Graph and Twitter tags, and a robots tag. Pages that should stay out of search (404, offline, My Schedule and placeholder speakers and sessions marked TBD) say `noindex`.
- Structured data (JSON-LD): the organization (`NGO`, with its registration number and address from `site.json`) and the website on every page, breadcrumbs on inner pages, `Event` on every event page, an event list on `/events`, `FAQPage` on the FAQ, `BlogPosting` on posts and `SoftwareSourceCode` on open source projects.
- `/robots.txt` and `/sitemap.xml`. The sitemap lists every indexable page with a priority and update frequency, and the build removes any page that says `noindex`.
- `/.well-known/security.txt`, which says where to report a security problem. Update its `Expires` date once a year.

Event pages take their title, description, address and image from the synced event, so adding an event to `event-sources.json` gives it all of this.
