import { describe, expect, it } from 'vitest';
import { sitemapFilter, sitemapItem } from './sitemap';

const page = (path: string) => `https://nodesudbury.com${path}`;

describe('sitemapFilter', () => {
  it.each(['/offline', '/offline/', '/events/my-schedule', '/design'])('leaves out %s', (path) => {
    expect(sitemapFilter(page(path))).toBe(false);
  });

  it.each(['/', '/events', '/events/devfest-sudbury-2026', '/blog', '/team'])(
    'keeps %s',
    (path) => {
      expect(sitemapFilter(page(path))).toBe(true);
    },
  );
});

describe('sitemapItem', () => {
  const built = new Date('2026-10-13T12:00:00Z');

  it('ranks the home page first and events above posts', () => {
    const priority = (path: string) => sitemapItem({ url: page(path) }, built).priority;

    expect(priority('/')).toBe(1);
    expect(priority('/events/devfest-sudbury-2026')).toBeGreaterThan(priority('/blog/hello')!);
  });

  it('asks crawlers to revisit events daily and stamps the build time', () => {
    expect(sitemapItem({ url: page('/events/devfest-sudbury-2026') }, built)).toMatchObject({
      changefreq: 'daily',
      lastmod: '2026-10-13T12:00:00.000Z',
    });
  });

  it('gives an unlisted page the middle priority', () => {
    expect(sitemapItem({ url: page('/somewhere') }, built).priority).toBe(0.5);
  });
});
