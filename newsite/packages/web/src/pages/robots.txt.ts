import type { APIRoute } from 'astro';
import { site } from 'virtual:node-site/site';
import { NOINDEX_PATHS } from '../../build/sitemap';

/** Crawlers may read everything except the pages that are not meant for search results. */
export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      ...NOINDEX_PATHS.map((path) => `Disallow: ${path}`),
      '',
      `Sitemap: ${new URL('sitemap-index.xml', site.url).href}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
