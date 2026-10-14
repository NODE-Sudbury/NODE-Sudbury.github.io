import sitemap from '@astrojs/sitemap';
import lit from '@awesome.me/astro-lit';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { env } from 'node:process';
import { chunkFileNames } from './build/chunk-names';
import { sitemapFilter, sitemapItem } from './build/sitemap';
import { sitemapNoindex } from './build/sitemap-noindex';
import { csp, type CspSite } from './build/csp';
import { decorators } from './build/decorators';
import { CONFIG_PATHS, production, resolveConfig, withDevBar } from './build/resolve-config';
import { routes } from './build/routes';
import { attendingPrecache, schedulePrecache, serviceWorker } from './build/service-worker';
import { sitePublic } from './build/site-public';
import { withSupabaseSiteSettings } from './build/site-settings';
import { site } from './build/vite-plugin-site';

if (CONFIG_PATHS.site.endsWith('demo-config')) {
  console.info('Using the demo site in packages/demo-config: packages/config has no site.json.');
}
// The Supabase project the build signs in against: .env.development for `npm start`, else .env.production.
const publicEnv = loadEnv(
  env['NODE_ENV'] === 'development' ? 'development' : 'production',
  process.cwd(),
  ['PUBLIC_', 'NEXT_PUBLIC_'],
);
// The social links in the footer are kept in Supabase, so the admins can change them.
const config = await withSupabaseSiteSettings(
  withDevBar(resolveConfig(), env['FIRESTORE_TARGET']),
  publicEnv['NEXT_PUBLIC_SUPABASE_URL'],
  publicEnv['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
);

export default defineConfig({
  site: config.site.url,
  output: 'static',
  // Matches `trailingSlash: false` in firebase.json: `/speakers/abc` is `speakers/abc.html`.
  trailingSlash: 'never',
  // Pages share one store, which each page fills with its content in turn (`seedPage()`).
  build: { format: 'file', concurrency: 1 },
  integrations: [
    {
      name: 'node-site-members-address',
      hooks: {
        // Vercel rewrites /members/<handle> and /profile/<id> to one page each (see vercel.json); the
        // dev server does it here.
        'astro:server:setup': ({ server }) => {
          server.middlewares.use((request, _response, next) => {
            if (request.url?.startsWith('/members/')) request.url = '/members';
            if (request.url?.startsWith('/profile/')) request.url = '/profile';
            next();
          });
        },
      },
    },
    lit(),
    {
      name: 'node-site-hydration',
      hooks: {
        // Islands import this before their components. Loaded later, a component renders twice.
        'astro:config:setup': ({ injectScript }) =>
          injectScript(
            'before-hydration',
            `import '@awesome.me/astro-lit/dsd-polyfill.js';
            import '@awesome.me/astro-lit/hydration-support.js';`,
          ),
      },
    },
    routes(config.site.features),
    sitemap({ filter: sitemapFilter, serialize: (item) => sitemapItem(item) }),
    sitemapNoindex(config.site.url),
    sitePublic(CONFIG_PATHS.public[0]!),
    // Before the service worker, which precaches the pages it changes. Deploys build with
    // FIRESTORE_TARGET=production, and every other build may run on the emulators.
    csp(config.site as CspSite, {
      emulators: env['FIRESTORE_TARGET'] !== 'production',
      supabaseUrl: publicEnv['NEXT_PUBLIC_SUPABASE_URL'],
    }),
    serviceWorker([...attendingPrecache(config), ...schedulePrecache(config)]),
  ],
  vite: {
    // The Supabase variables keep the names the Vercel project already has.
    envPrefix: ['PUBLIC_', 'NEXT_PUBLIC_'],
    // Content read from the sample data has no Firebase behind it, so the browser skips live updates.
    define: { __HB_STATIC_CONTENT__: JSON.stringify(env['FIRESTORE_TARGET'] === 'sample') },
    // The build smoke test links node_modules into a copy of this package. Astro fails on
    // `.astro` files that resolve outside its root.
    resolve: { preserveSymlinks: true },
    build: {
      sourcemap: production,
      minify: production,
      rolldownOptions: {
        output: {
          // Keeps the rarely changing Firebase SDK in its own cacheable chunk.
          codeSplitting: {
            groups: [{ name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/ }],
          },
        },
      },
    },
    // Astro names client chunks itself unless the client environment says otherwise.
    environments: {
      client: { build: { rolldownOptions: { output: { chunkFileNames } } } },
    },
    plugins: [decorators(), ...site(config)],
  },
});
