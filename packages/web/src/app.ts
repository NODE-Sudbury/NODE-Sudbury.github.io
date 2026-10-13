import { onUser } from './store/auth';
import { subscribeToPageContent } from './store/content';
import { setFilters } from './store/filters';
import { watchConnection } from './store/sync';
import { logPageView } from './utils/analytics';
import { loadOtherBuildsInFull } from './utils/build';
import { parseFilters } from './utils/filters';
import { islandsHydrated } from './utils/islands';
import {
  type PreparationEvent,
  renderNextPageInSourceLocale,
  startLocalization,
} from './utils/localization';

declare const __HB_STATIC_CONTENT__: boolean | undefined;
// Sites built from the sample data have no Firebase, so their content stays as built.
const staticContent = typeof __HB_STATIC_CONTENT__ !== 'undefined' && __HB_STATIC_CONTENT__;

// Changes that re-render components wait for the page to hydrate, or hydration keeps stale HTML.
const afterHydration = async () => {
  await islandsHydrated();
  if (!staticContent) subscribeToPageContent();
  // Pages are built without a query string, so filters from the URL apply after hydration.
  setFilters(parseFilters());
  await startLocalization();
};

/** Starts what lasts across pages. The layout calls it once, when the first page loads. */
export const startApp = async (): Promise<void> => {
  document.addEventListener('astro:before-preparation', (event) =>
    loadOtherBuildsInFull(event as Parameters<typeof loadOtherBuildsInFull>[0]),
  );
  document.addEventListener('astro:before-preparation', (event) =>
    renderNextPageInSourceLocale(event as PreparationEvent),
  );
  document.addEventListener('astro:before-swap', () => setFilters([]));
  // Analytics logs the first page view itself.
  document.addEventListener('astro:after-swap', () => {
    logPageView();
    void afterHydration();
  });

  await afterHydration();
  watchConnection();
  // The signed-in state changes the header, so it waits for hydration too.
  onUser();
};
