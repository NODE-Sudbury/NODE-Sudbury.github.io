const url = import.meta.env['NEXT_PUBLIC_SUPABASE_URL'] as string | undefined;
const anonKey = import.meta.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] as string | undefined;

/** Visits by programs that read pages rather than people, such as crawlers and link previews. */
const BOT =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|monitor/i;

/**
 * The address a view is counted under, or nothing when it is not counted. The admin and account
 * pages are not counted, and a member's own page is counted as the members page, so the counts
 * never say whose profile was opened.
 */
export const countedPath = (pathname: string): string | undefined => {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (/^\/(admin|account)(\/|$)/.test(path)) return undefined;
  if (/^\/(members|profile)\//.test(path)) return '/members';
  return path;
};

/** Whether this visitor asked not to be counted, or is not a person. */
export const optedOut = (nav: {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
  webdriver?: boolean;
  userAgent?: string;
}): boolean =>
  nav.doNotTrack === '1' ||
  nav.globalPrivacyControl === true ||
  nav.webdriver === true ||
  BOT.test(nav.userAgent ?? '');

let lastPath: string | undefined;

/**
 * Counts one view of the page that is open, for the analytics in the admin dashboard. Every page
 * calls it from the shared layout, so new pages such as blog posts are counted without anything
 * being set up. It sends only the address, never who is looking, and respects Do Not Track.
 */
export const recordPageView = (): void => {
  if (!url || !anonKey) return;
  const path = countedPath(window.location.pathname);
  // The same page twice in a row is one view, such as the first load and its navigation event.
  if (!path || path === lastPath) return;
  if (optedOut(navigator as Parameters<typeof optedOut>[0])) return;
  lastPath = path;
  void fetch(`${url}/rest/v1/rpc/record_page_view`, {
    method: 'POST',
    keepalive: true,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_path: path }),
  }).catch(() => undefined);
};
