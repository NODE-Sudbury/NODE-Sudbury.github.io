import { msg, str } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { url as siteUrl } from '../../config/site';
import { fetchDailyViews, fetchTopPages } from '../../db/admin-analytics';
import type { DailyViews, PageViews } from '../../models/analytics';
import { ThemedComponent } from '../themed-component';
import '../ui/hb-progress';
import '../ui/hb-text-field';
import type { HbTextField } from '../ui/hb-text-field';
import { type PageChange, PAGE_SIZES } from './admin-pager';
import './admin-pager';

/** The ranges to look at, in days. */
const RANGES = [1, 7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const rangeLabel = (days: Range) =>
  ({
    1: msg('Today', { id: 'pages.admin.range-today' }),
    7: msg('7 days', { id: 'pages.admin.range-7' }),
    30: msg('30 days', { id: 'pages.admin.range-30' }),
    90: msg('90 days', { id: 'pages.admin.range-90' }),
  })[days];

/** What a page is called in the list: the home page is the site's own name, the rest their address. */
export const pageName = (path: string): string =>
  path === '/' ? new URL(siteUrl).hostname.replace(/^www\./, '') : path;

const number = (value: number) => new Intl.NumberFormat('en-CA').format(value);

const dayLabel = (day: string) =>
  new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
  );

/**
 * The Analytics section of the admin dashboard: how often pages are opened, as totals, per day and
 * the most viewed pages. The counts come from the pages themselves, so new pages appear here by
 * themselves.
 */
@customElement('admin-analytics')
export class AdminAnalytics extends ThemedComponent {
  static override styles = css`
    :host {
      display: grid;
      gap: var(--hb-space-5);
    }

    .ranges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--hb-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .ranges button {
      min-block-size: var(--hb-target-min);
      padding: var(--hb-space-1) var(--hb-space-4);
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-control);
      background: none;
      color: inherit;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    .ranges button[aria-pressed='true'] {
      border-color: var(--hb-color-primary);
      background-color: color-mix(in srgb, var(--hb-color-primary) 16%, transparent);
      color: var(--hb-color-primary);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: var(--hb-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .stat {
      display: grid;
      gap: var(--hb-space-1);
      padding: var(--hb-space-5);
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      background-color: var(--hb-panel-background);
      box-shadow: var(--hb-shadow-card);
    }

    .stat-number {
      font-size: var(--hb-text-3xl);
      font-weight: 700;
      line-height: 1;
      overflow-wrap: anywhere;
    }

    .stat-label {
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      font-weight: 600;
    }

    .chart {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      block-size: 8rem;
      padding: var(--hb-space-3);
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      background-color: var(--hb-panel-background);
    }

    .bar {
      flex: 1 1 0;
      min-inline-size: 1px;
      min-block-size: 2px;
      border-radius: 2px 2px 0 0;
      background-color: var(--hb-color-primary);
    }

    .bar.none {
      background-color: var(--hb-border-color);
    }

    .axis {
      display: flex;
      justify-content: space-between;
      margin: 0;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }

    h2 {
      margin: 0;
      font-size: var(--hb-text-lg);
    }

    .scroll {
      overflow-x: auto;
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      background-color: var(--hb-panel-background);
    }

    table {
      inline-size: 100%;
      min-inline-size: 32rem;
      border-collapse: collapse;
    }

    th,
    td {
      padding: var(--hb-space-3) var(--hb-space-4);
      border-block-end: var(--hb-border-width) solid var(--hb-border-color);
      text-align: start;
      vertical-align: middle;
    }

    tbody tr:last-child td {
      border-block-end: 0;
    }

    th {
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      font-weight: 600;
      white-space: nowrap;
    }

    td.views,
    th.views {
      text-align: end;
      font-variant-numeric: tabular-nums;
    }

    td a {
      color: inherit;
      overflow-wrap: anywhere;
    }

    .share {
      display: block;
      block-size: 6px;
      min-inline-size: 4rem;
      border-radius: 3px;
      background: linear-gradient(
        to right,
        var(--hb-color-primary) var(--share, 0%),
        var(--hb-border-color) var(--share, 0%)
      );
    }

    .note,
    .empty {
      margin: 0;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }

    .empty {
      padding: var(--hb-space-6);
      border: var(--hb-border-width) dashed var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      font-size: inherit;
    }
  `;

  @state()
  private accessor days: Range = 30;
  @state()
  private accessor pages: PageViews[] = [];
  @state()
  private accessor daily: DailyViews[] = [];
  @state()
  private accessor loading = true;
  @state()
  private accessor failed = false;
  @state()
  private accessor query = '';
  @state()
  private accessor page = 1;
  @state()
  private accessor pageSize: number = PAGE_SIZES[0];

  override async firstUpdated() {
    await this.load();
  }

  private async load() {
    this.loading = true;
    this.failed = false;
    try {
      [this.pages, this.daily] = await Promise.all([
        fetchTopPages(this.days),
        fetchDailyViews(this.days),
      ]);
    } catch {
      this.failed = true;
    } finally {
      this.loading = false;
    }
  }

  private get total() {
    return this.pages.reduce((sum, { views }) => sum + views, 0);
  }

  private get shown(): PageViews[] {
    const words = this.query.toLowerCase().split(/\s+/).filter(Boolean);
    return this.pages.filter(({ path }) => {
      const name = `${path} ${pageName(path)}`;
      return words.every((word) => name.includes(word));
    });
  }

  override render() {
    return html`
      <ul class="ranges" aria-label="${msg('Range', { id: 'pages.admin.range' })}">
        ${RANGES.map(
          (days) =>
            html`<li>
              <button
                type="button"
                aria-pressed="${days === this.days}"
                @click="${() => this.setRange(days)}"
              >
                ${rangeLabel(days)}
              </button>
            </li>`,
        )}
      </ul>
      ${this.loading ? html`<hb-progress></hb-progress>` : this.failed ? this.renderFailed() : this.renderBody()}
    `;
  }

  private renderFailed() {
    return html`<p class="empty">
      ${msg('The numbers could not be loaded. Please, try again later.', {
        id: 'pages.admin.analytics-failed',
      })}
    </p>`;
  }

  private renderBody() {
    const top = this.pages[0];
    return html`
      <ul class="stats">
        <li class="stat">
          <span class="stat-number">${number(this.total)}</span>
          <span class="stat-label">${msg('Page views', { id: 'pages.admin.stat-views' })}</span>
        </li>
        <li class="stat">
          <span class="stat-number">${number(this.pages.length)}</span>
          <span class="stat-label">${msg('Pages opened', { id: 'pages.admin.stat-pages' })}</span>
        </li>
        <li class="stat">
          <span class="stat-number">${top ? pageName(top.path) : '-'}</span>
          <span class="stat-label">${msg('Most viewed', { id: 'pages.admin.stat-top' })}</span>
        </li>
      </ul>
      ${this.renderChart()}
      <h2>${msg('Most viewed pages', { id: 'pages.admin.top-pages' })}</h2>
      ${this.pages.length ? this.renderPages() : this.renderEmpty()}
      <p class="note">
        ${msg(
          'Only the address of each page and the day are counted. No cookies, no visitor addresses, and nothing about who looked. Visitors who ask not to be tracked are not counted.',
          { id: 'pages.admin.analytics-note' },
        )}
      </p>
    `;
  }

  private renderChart() {
    const { daily } = this;
    if (daily.length < 2) return nothing;
    const peak = Math.max(...daily.map(({ views }) => views), 1);
    const first = daily[0]!;
    const last = daily.at(-1)!;
    return html`<div
        class="chart"
        role="img"
        aria-label="${msg(
          str`Views per day, from ${dayLabel(first.day)} to ${dayLabel(last.day)}`,
          {
            id: 'pages.admin.chart-label',
          },
        )}"
      >
        ${daily.map(
          ({ day, views }) =>
            html`<span
              class="bar ${views ? '' : 'none'}"
              style="block-size: ${(views / peak) * 100}%"
              title="${dayLabel(day)}: ${number(views)}"
            ></span>`,
        )}
      </div>
      <p class="axis" aria-hidden="true">
        <span>${dayLabel(first.day)}</span><span>${dayLabel(last.day)}</span>
      </p>`;
  }

  private renderEmpty() {
    return html`<p class="empty">
      ${msg('Nothing has been counted in this range yet.', { id: 'pages.admin.analytics-none' })}
    </p>`;
  }

  private renderPages() {
    const { shown } = this;
    const pageCount = Math.max(1, Math.ceil(shown.length / this.pageSize));
    const page = Math.min(this.page, pageCount);
    const start = (page - 1) * this.pageSize;
    return html`
      <hb-text-field
        type="search"
        name="search"
        label="${msg('Search pages', { id: 'pages.admin.analytics-search' })}"
        .value="${this.query}"
        @input="${this.onSearch}"
      ></hb-text-field>
      ${
        shown.length
          ? html`<div class="scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">${msg('Page', { id: 'pages.admin.col-page' })}</th>
                      <th scope="col" class="views">
                        ${msg('Views', { id: 'pages.admin.col-views' })}
                      </th>
                      <th scope="col">${msg('Share', { id: 'pages.admin.col-share' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${shown.slice(start, start + this.pageSize).map((row) => this.renderRow(row))}
                  </tbody>
                </table>
              </div>
              <admin-pager
                .total="${shown.length}"
                .page="${page}"
                .pageSize="${this.pageSize}"
                @pagechange="${this.onPageChange}"
              ></admin-pager>`
          : html`<p class="empty">
              ${msg('Nothing matches your search.', { id: 'pages.admin.org-none-match' })}
            </p>`
      }
    `;
  }

  private renderRow({ path, views }: PageViews) {
    const share = this.total ? (views / this.total) * 100 : 0;
    return html`<tr>
      <td>
        <a href="${path}" target="_blank" rel="noopener noreferrer">${pageName(path)}</a>
      </td>
      <td class="views">${number(views)}</td>
      <td>
        <span class="share" style="--share: ${share}%" title="${Math.round(share)}%"></span>
      </td>
    </tr>`;
  }

  private setRange(days: Range) {
    if (days === this.days) return;
    this.days = days;
    this.page = 1;
    void this.load();
  }

  private readonly onSearch = (event: Event) => {
    this.query = (event.target as HbTextField).value;
    this.page = 1;
  };

  private readonly onPageChange = (event: CustomEvent<PageChange>) => {
    this.page = event.detail.page;
    this.pageSize = event.detail.pageSize;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-analytics': AdminAnalytics;
  }
}
