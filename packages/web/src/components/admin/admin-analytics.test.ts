import { fireEvent } from '@testing-library/dom';
import { html, nothing, render as litRender } from 'lit';
import { deepQuerySelector, deepQuerySelectorAll, screen } from 'shadow-dom-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../__tests__/helpers/axe';
import { fixture } from '../../../__tests__/helpers/fixtures';
import { fetchDailyViews, fetchTopPages } from '../../db/admin-analytics';
import type { HbTextField } from '../ui/hb-text-field';
import type { AdminAnalytics } from './admin-analytics';
import './admin-analytics';

vi.mock('../../config/site', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/site')>()),
  url: 'https://www.nodesudbury.com/',
}));
vi.mock('../../db/admin-analytics', () => ({
  fetchTopPages: vi.fn(),
  fetchDailyViews: vi.fn(),
}));

const pages = [
  { path: '/', views: 60 },
  { path: '/blog/hello-world', views: 30 },
  { path: '/events', views: 10 },
];

const daily = [
  { day: '2026-10-12', views: 0 },
  { day: '2026-10-13', views: 40 },
  { day: '2026-10-14', views: 60 },
];

const render = async (list = pages) => {
  vi.mocked(fetchTopPages).mockResolvedValue(list);
  vi.mocked(fetchDailyViews).mockResolvedValue(daily);
  const result = await fixture<AdminAnalytics>(html`<admin-analytics></admin-analytics>`);
  await vi.waitFor(() => expect(result.element['loading']).toBe(false));
  await result.element.updateComplete;
  return result;
};

describe('admin-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    litRender(nothing, document.body);
  });

  it('opens on the last 30 days, with the totals and the most viewed page', async () => {
    const { shadowRoot } = await render();

    expect(fetchTopPages).toHaveBeenCalledWith(30);
    expect(fetchDailyViews).toHaveBeenCalledWith(30);
    expect(screen.getByShadowRole('button', { name: '30 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(shadowRoot).toHaveTextContent('100');
    expect(shadowRoot).toHaveTextContent('Page views');
    expect(shadowRoot).toHaveTextContent('Pages opened');
    expect(shadowRoot).toHaveTextContent('Most viewed');
    expect(shadowRoot).toHaveTextContent('nodesudbury.com');
  });

  it('lists the pages by views, with their share, and links to open them', async () => {
    await render();

    const rows = screen.getAllByShadowRole('row');
    expect(rows[1]).toHaveTextContent('nodesudbury.com');
    expect(rows[1]).toHaveTextContent('60');
    expect(rows[2]).toHaveTextContent('/blog/hello-world');
    expect(screen.getByShadowRole('link', { name: '/blog/hello-world' })).toHaveAttribute(
      'href',
      '/blog/hello-world',
    );
    // The home page is named after the site, and still opens the home page.
    expect(screen.getByShadowRole('link', { name: 'nodesudbury.com' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('draws a bar for each day', async () => {
    const { shadowRoot } = await render();

    expect(screen.getByShadowRole('img')).toBeInTheDocument();
    expect(deepQuerySelectorAll(shadowRoot, '.bar')).toHaveLength(3);
  });

  it('loads the numbers again for another range', async () => {
    const { element } = await render();

    fireEvent.click(screen.getByShadowRole('button', { name: '7 days' }));
    await element.updateComplete;

    await vi.waitFor(() => expect(fetchTopPages).toHaveBeenCalledWith(7));
    expect(fetchDailyViews).toHaveBeenCalledWith(7);
  });

  it('searches the pages', async () => {
    const { element, shadowRoot } = await render();
    const search = deepQuerySelector<HbTextField>(shadowRoot, 'hb-text-field[name="search"]')!;

    search.value = 'blog';
    search.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await element.updateComplete;
    expect(screen.getAllByShadowRole('row')).toHaveLength(2);

    search.value = 'zzz';
    search.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await element.updateComplete;
    expect(shadowRoot).toHaveTextContent('Nothing matches your search.');
  });

  it('finds the home page by the site name, or by its address', async () => {
    const { element, shadowRoot } = await render();
    const search = deepQuerySelector<HbTextField>(shadowRoot, 'hb-text-field[name="search"]')!;

    search.value = 'nodesudbury';
    search.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await element.updateComplete;

    expect(screen.getAllByShadowRole('row')).toHaveLength(2);
  });

  it('says so when nothing has been counted, or the numbers cannot be read', async () => {
    const empty = await render([]);
    expect(empty.shadowRoot).toHaveTextContent('Nothing has been counted in this range yet.');
    litRender(nothing, document.body);

    vi.mocked(fetchTopPages).mockRejectedValue(new Error('denied'));
    const { element, shadowRoot } = await fixture<AdminAnalytics>(
      html`<admin-analytics></admin-analytics>`,
    );
    await vi.waitFor(() => expect(element['loading']).toBe(false));
    await element.updateComplete;
    expect(shadowRoot).toHaveTextContent('The numbers could not be loaded.');
  });

  it('says what is counted, and what is not', async () => {
    const { shadowRoot } = await render();

    expect(shadowRoot).toHaveTextContent('No cookies, no visitor addresses');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expectNoAxeViolations(element);
  });
});
