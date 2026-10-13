import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { noindexUrls, publishSitemap, withoutUrls } from './sitemap-noindex';

const page = (robots: string) =>
  `<html><head><meta content="${robots}" name="robots"></head><body></body></html>`;

describe('noindexUrls', () => {
  it('finds the built pages with a noindex robots tag, as site addresses', () => {
    const dist = mkdtempSync(join(tmpdir(), 'dist-'));
    mkdirSync(join(dist, 'speakers'));
    writeFileSync(join(dist, 'index.html'), page('index, follow'));
    writeFileSync(join(dist, '404.html'), page('noindex, nofollow'));
    writeFileSync(join(dist, 'speakers', 'tbd-1.html'), page('noindex, nofollow'));
    writeFileSync(join(dist, 'speakers', 'ada.html'), page('index, follow'));

    expect(noindexUrls(dist, 'https://nodesudbury.com/').sort()).toEqual([
      'https://nodesudbury.com/404',
      'https://nodesudbury.com/speakers/tbd-1',
    ]);
  });
});

describe('withoutUrls', () => {
  const xml =
    '<urlset><url><loc>https://nodesudbury.com/</loc><priority>1</priority></url>' +
    '<url><loc>https://nodesudbury.com/speakers/tbd-1</loc><priority>0.5</priority></url></urlset>';

  it('removes only the listed pages', () => {
    const result = withoutUrls(xml, ['https://nodesudbury.com/speakers/tbd-1']);

    expect(result).toContain('https://nodesudbury.com/</loc>');
    expect(result).not.toContain('tbd-1');
  });

  it('leaves the sitemap alone when nothing is listed', () => {
    expect(withoutUrls(xml, [])).toBe(xml);
  });
});

describe('publishSitemap', () => {
  it('copies the only sitemap to sitemap.xml', () => {
    const dist = mkdtempSync(join(tmpdir(), 'dist-'));
    writeFileSync(join(dist, 'sitemap-index.xml'), '<sitemapindex/>');
    writeFileSync(join(dist, 'sitemap-0.xml'), '<urlset/>');

    expect(publishSitemap(dist)).toBe(true);
    expect(readFileSync(join(dist, 'sitemap.xml'), 'utf8')).toBe('<urlset/>');
  });

  it('leaves the index as the entry point when there are several sitemaps', () => {
    const dist = mkdtempSync(join(tmpdir(), 'dist-'));
    writeFileSync(join(dist, 'sitemap-0.xml'), '<urlset/>');
    writeFileSync(join(dist, 'sitemap-1.xml'), '<urlset/>');

    expect(publishSitemap(dist)).toBe(false);
  });
});
