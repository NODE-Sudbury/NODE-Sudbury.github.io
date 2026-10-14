import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async () => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  return import('./page-views');
};

describe('countedPath', () => {
  it('counts a page under its own address, in lower case and without a trailing slash', async () => {
    const { countedPath } = await load();

    expect(countedPath('/')).toBe('/');
    expect(countedPath('/Blog/Hello-World/')).toBe('/blog/hello-world');
    expect(countedPath('/events/devfest-2026')).toBe('/events/devfest-2026');
  });

  it('does not count the admin and account pages', async () => {
    const { countedPath } = await load();

    expect(countedPath('/admin')).toBeUndefined();
    expect(countedPath('/admin/members')).toBeUndefined();
    expect(countedPath('/account')).toBeUndefined();
    expect(countedPath('/administration')).toBe('/administration');
  });

  it('counts a member or profile page as the members page, so it never says whose', async () => {
    const { countedPath } = await load();

    expect(countedPath('/members/hannanmax')).toBe('/members');
    expect(countedPath('/profile/cea1bd28-92ce-42ef-98b0-0c1967f1355a')).toBe('/members');
  });
});

describe('optedOut', () => {
  it('skips visitors who asked not to be tracked, and programs that are not people', async () => {
    const { optedOut } = await load();

    expect(optedOut({ doNotTrack: '1' })).toBe(true);
    expect(optedOut({ globalPrivacyControl: true })).toBe(true);
    expect(optedOut({ webdriver: true })).toBe(true);
    expect(optedOut({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' })).toBe(true);
    expect(
      optedOut({ userAgent: 'Mozilla/5.0 (Macintosh) Safari/605.1.15', doNotTrack: '0' }),
    ).toBe(false);
  });
});

describe('recordPageView', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
    Reflect.deleteProperty(navigator, 'doNotTrack');
  });

  it('sends the address of the page, and nothing about the visitor', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({} as Response);
    const { recordPageView } = await load();
    window.history.pushState({}, '', '/blog/hello?utm=1');

    recordPageView();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [address, init] = fetch.mock.calls[0]!;
    expect(address).toBe('https://project.supabase.co/rest/v1/rpc/record_page_view');
    expect(init).toMatchObject({ method: 'POST', keepalive: true });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ p_path: '/blog/hello' });
  });

  it('counts the same page once in a row, and a new page again', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({} as Response);
    const { recordPageView } = await load();
    window.history.pushState({}, '', '/events');

    recordPageView();
    recordPageView();
    window.history.pushState({}, '', '/faq');
    recordPageView();

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('counts nothing on the admin pages, or for a visitor who opted out', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({} as Response);
    const { recordPageView } = await load();
    window.history.pushState({}, '', '/admin');
    recordPageView();
    expect(fetch).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true });
    window.history.pushState({}, '', '/events');
    recordPageView();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does nothing without a Supabase project', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({} as Response);
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const { recordPageView } = await import('./page-views');

    recordPageView();

    expect(fetch).not.toHaveBeenCalled();
  });
});
