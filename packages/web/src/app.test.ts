import { afterAll, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
import { startApp } from './app';
import { store } from './store';
import { onUser } from './store/auth';
import { selectFilters } from './store/filters';
import { logPageView } from './utils/analytics';
import { recordPageView } from './utils/page-views';
import { renderNextPageInSourceLocale, startLocalization } from './utils/localization';

vi.mock('./store/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./store/auth')>()),
  onUser: vi.fn(),
}));
vi.mock('./utils/analytics', () => ({ logPageView: vi.fn() }));
vi.mock('./utils/page-views', () => ({ recordPageView: vi.fn() }));
vi.mock('./utils/localization', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./utils/localization')>()),
  renderNextPageInSourceLocale: vi.fn(),
  startLocalization: vi.fn(() => Promise.resolve()),
}));

describe('startApp', () => {
  // The setup clears mocks before each test, so record what startup called.
  const startupCalls: string[] = [];

  beforeAll(async () => {
    vi.mocked(startLocalization).mockImplementationOnce(async () => {
      startupCalls.push('startLocalization');
    });
    vi.mocked(onUser).mockImplementationOnce(() => {
      startupCalls.push('onUser');
    });
    window.history.replaceState({}, '', '/speakers?tags=Web');
    await startApp();
  });

  afterAll(() => window.history.replaceState({}, '', '/'));

  it("applies the URL's filters once the page has hydrated", () => {
    expect(selectFilters(store.getState())).toEqual([{ group: 'tags', tag: 'Web' }]);
  });

  it('clears the filters before the next page swaps in, then applies its URL', async () => {
    document.dispatchEvent(new Event('astro:before-swap'));

    expect(selectFilters(store.getState())).toEqual([]);

    window.history.replaceState({}, '', '/events?complexity=Beginner');
    document.dispatchEvent(new Event('astro:after-swap'));

    await vi.waitFor(() =>
      expect(selectFilters(store.getState())).toEqual([{ group: 'complexity', tag: 'Beginner' }]),
    );
  });

  it('switches locale, then listens for the user, once the page has hydrated', () => {
    expect(startupCalls).toEqual(['startLocalization', 'onUser']);
  });

  it('logs a page view and switches locale again after client navigation', async () => {
    document.dispatchEvent(new Event('astro:after-swap'));

    expect(logPageView).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(startLocalization).toHaveBeenCalledOnce());
  });

  it('counts the first page view when it starts, and each page that swaps in', () => {
    // The first view was counted at startup, but the setup clears mocks, so swap once more.
    vi.mocked(recordPageView).mockClear();

    document.dispatchEvent(new Event('astro:after-swap'));

    expect(recordPageView).toHaveBeenCalledOnce();
  });

  it('prepares each next page in the source locale', () => {
    const event = new Event('astro:before-preparation');

    document.dispatchEvent(event);

    expect(renderNextPageInSourceLocale).toHaveBeenCalledWith(event);
  });

  it('follows the connection once the page has hydrated', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    onTestFinished(() => onLine.mockRestore());

    window.dispatchEvent(new Event('offline'));
    expect(store.getState().sync.online).toBe(false);

    onLine.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    expect(store.getState().sync.online).toBe(true);
    expect(store.getState().snackbars.at(-1)?.label).toBe('Back online.');
  });
});
