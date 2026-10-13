import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

const NOINDEX =
  /<meta[^>]*name="robots"[^>]*content="[^"]*noindex|<meta[^>]*content="[^"]*noindex[^"]*"[^>]*name="robots"/;

const htmlFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });

/** The built pages that ask search engines to skip them, as their addresses on the site. */
export const noindexUrls = (dist: string, siteUrl: string): string[] =>
  htmlFiles(dist)
    .filter((file) => NOINDEX.test(readFileSync(file, 'utf8')))
    .map((file) => {
      const path = relative(dist, file)
        .replace(/(^|\/)index\.html$/, '$1')
        .replace(/\.html$/, '');
      return new URL(path, siteUrl).href;
    });

/** Takes the given pages out of a sitemap's XML. */
export const withoutUrls = (xml: string, urls: readonly string[]): string =>
  urls.reduce((result, url) => {
    const entry = new RegExp(
      `<url><loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>.*?</url>`,
      's',
    );
    return result.replace(entry, '');
  }, xml);

/**
 * After the sitemap is written, drops every page that has a noindex robots tag. A page can't ask
 * search engines to skip it and also invite them to index it.
 */
export const sitemapNoindex = (siteUrl: string): AstroIntegration => ({
  name: 'node-site-sitemap-noindex',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const dist = fileURLToPath(dir);
      const skipped = noindexUrls(dist, siteUrl);
      for (const name of readdirSync(dist).filter((file) => /^sitemap-\d+\.xml$/.test(file))) {
        const file = join(dist, name);
        if (!existsSync(file)) continue;
        writeFileSync(file, withoutUrls(readFileSync(file, 'utf8'), skipped));
      }
      logger.info(`Left ${skipped.length} noindex page(s) out of the sitemap.`);
    },
  },
});
