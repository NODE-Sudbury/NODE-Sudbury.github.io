# NODE website

The new website for NODE, the Northern Ontario Dev Exchange: events, board, blog, membership, partners and the open source projects of the NODE-Sudbury organization.

## Run it

Needs Node.js 22.

```console
npm ci
FIRESTORE_TARGET=sample NODE_ENV=development npm --prefix packages/web run start:astro
```

The site opens at http://localhost:4321 and reads its content from `packages/config`.

## Where things are

| Path                                | What it holds                                                          |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `packages/config/site.json`         | Site settings, navigation and features                                 |
| `packages/config/content/`          | Home page text, FAQ, code of conduct and the open source data          |
| `packages/config/sample-data/`      | Board, partners, gallery, blog, events and membership                  |
| `packages/config/public/images/`    | Logos and photos                                                       |
| `packages/web/`                     | The website itself                                                     |

## Open source data

The Open Source page lists the public repositories of the organization, with contributors and activity. Refresh it with:

```console
npm --prefix packages/web run sync:github
```

Set `GITHUB_TOKEN` for a higher rate limit. Building with `SYNC_GITHUB=1` refreshes it first, and a daily workflow can rebuild the site on a schedule.

## Events

The Events page and each event's own page come from the event links in `packages/config/content/event-sources.json`. Add a GDG (`gdg.community.dev`) or Luma (`luma.com`) link there with its category, then run `npm --prefix packages/web run sync:events`. The sync reads the public details of each page: description, address, tags, ticket types and the sign-up count. Building with `SYNC_EVENTS=1` refreshes them first, and the same daily workflow keeps the numbers current.

## License

Parts of this project are used under the MIT License. See [LICENSE.md](./LICENSE.md).

## Search engines and sharing

Every page carries what search engines and link previews read:

- A unique title and description, a canonical link, Open Graph and Twitter tags, and a robots tag. Pages that should stay out of search (404, offline, My Schedule and placeholder speakers and sessions marked TBD) say `noindex`.
- Structured data (JSON-LD): the organization (`NGO`, with its registration number and address from `site.json`) and the website on every page, breadcrumbs on inner pages, `Event` on every event page, an event list on `/events`, `FAQPage` on the FAQ, `BlogPosting` on posts and `SoftwareSourceCode` on open source projects.
- `/robots.txt` and `/sitemap-index.xml`. The sitemap lists every indexable page with a priority and update frequency, and the build removes any page that says `noindex`.
- `/.well-known/security.txt`, which says where to report a security problem. Update its `Expires` date once a year.

Event pages take their title, description, address and image from the synced event, so adding an event to `event-sources.json` gives it all of this.
