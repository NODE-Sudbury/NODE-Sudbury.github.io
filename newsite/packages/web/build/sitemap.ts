import type { SitemapItem } from '@astrojs/sitemap';

/** Pages that stay out of search results, so they stay out of the sitemap and robots.txt too. */
export const NOINDEX_PATHS = ['/offline', '/events/my-schedule', '/design'] as const;

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
  [(path) => path === '/', 1, 'weekly'],
  [(path) => path === '/events', 0.9, 'daily'],
  [(path) => path.startsWith('/events/'), 0.8, 'daily'],
  [(path) => path === '/blog' || path === '/open-source', 0.7, 'weekly'],
  [(path) => path.startsWith('/blog/'), 0.6, 'monthly'],
  [(path) => path.startsWith('/open-source/'), 0.5, 'weekly'],
  [(path) => ['/team', '/faq', '/attending', '/speakers'].includes(path), 0.6, 'monthly'],
  [(path) => path === '/coc', 0.3, 'yearly'],
];

/** Adds the priority, change frequency and last change to a page. The site rebuilds daily. */
export const sitemapItem = (item: SitemapItem, built = new Date()): SitemapItem => {
  const path = pathOf(item.url);
  const [, priority, changefreq] = HINTS.find(([match]) => match(path)) ?? [, 0.5, 'monthly'];
  return { ...item, priority, changefreq, lastmod: built.toISOString() };
};
