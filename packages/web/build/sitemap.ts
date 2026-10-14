import { ChangeFreqEnum, type SitemapItem } from '@astrojs/sitemap';

/** Pages that stay out of search results, so they stay out of the sitemap and robots.txt too. */
export const NOINDEX_PATHS = [
  '/offline',
  '/events/my-schedule',
  '/design',
  '/account',
  '/members',
  '/profile',
  '/admin',
  '/admin/analytics',
  '/admin/events',
  '/admin/emails',
  '/admin/members',
  '/admin/settings',
  '/admin/sponsors',
] as const;

const pathOf = (page: string) => new URL(page).pathname.replace(/\/$/, '') || '/';

/** The sitemap lists every page except the ones that ask search engines to skip them. */
export const sitemapFilter = (page: string): boolean =>
  !NOINDEX_PATHS.some((path) => pathOf(page) === path);

// How much each part of the site matters, and how often it changes, as hints for crawlers.
const HINTS: [
  match: (path: string) => boolean,
  priority: number,
  changefreq: SitemapItem['changefreq'],
][] = [
  [(path) => path === '/', 1, ChangeFreqEnum.WEEKLY],
  [(path) => path === '/events', 0.9, ChangeFreqEnum.DAILY],
  [(path) => path.startsWith('/events/'), 0.8, ChangeFreqEnum.DAILY],
  [(path) => path === '/blog' || path === '/open-source', 0.7, ChangeFreqEnum.WEEKLY],
  [(path) => path.startsWith('/blog/'), 0.6, ChangeFreqEnum.MONTHLY],
  [(path) => path.startsWith('/open-source/'), 0.5, ChangeFreqEnum.WEEKLY],
  [
    (path) => ['/team', '/faq', '/attending', '/speakers'].includes(path),
    0.6,
    ChangeFreqEnum.MONTHLY,
  ],
  [(path) => path === '/coc', 0.3, ChangeFreqEnum.YEARLY],
];

/** Adds the priority, change frequency and last change to a page. The site rebuilds daily. */
export const sitemapItem = (item: SitemapItem, built = new Date()): SitemapItem => {
  const path = pathOf(item.url);
  const hint = HINTS.find(([match]) => match(path));
  const priority = hint?.[1] ?? 0.5;
  const changefreq = hint?.[2] ?? ChangeFreqEnum.MONTHLY;
  return { ...item, priority, changefreq, lastmod: built.toISOString() };
};
