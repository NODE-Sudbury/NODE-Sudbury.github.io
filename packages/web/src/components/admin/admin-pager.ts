import { msg, str } from '@lit/localize';
import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ThemedComponent } from '../themed-component';
import '../shared/node-icon';
import '../ui/hb-icon-button';

/** How many rows a page can show. The first is the default. */
export const PAGE_SIZES = [10, 30, 50] as const;

/** What `pagechange` carries: the page, counted from 1, and how many rows it holds. */
export interface PageChange {
  page: number;
  pageSize: number;
}

/**
 * The rows per page and the "1 of 3" page buttons under an admin table. It does not slice the rows:
 * the table keeps `page` and `pageSize`, and reads them back from `pagechange`.
 */
@customElement('admin-pager')
export class AdminPager extends ThemedComponent {
  static override styles = css`
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--hb-space-3) var(--hb-space-6);
    }

    .size,
    .pages {
      display: flex;
      align-items: center;
      gap: var(--hb-space-3);
      font-size: var(--hb-text-sm);
    }

    select {
      min-block-size: var(--hb-target-min);
      padding: var(--hb-space-1) var(--hb-space-3);
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-control);
      background-color: var(--hb-color-surface-container);
      color: inherit;
      font: inherit;
    }

    .position {
      min-inline-size: 4rem;
      text-align: center;
      font-weight: 600;
    }
  `;

  /** How many rows there are in all. */
  @property({ type: Number })
  accessor total = 0;

  @property({ type: Number })
  accessor pageSize: number = PAGE_SIZES[0];

  /** The page that is open, counted from 1. */
  @property({ type: Number })
  accessor page = 1;

  private get pageCount() {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  override render() {
    const { pageCount } = this;
    // The rows can shrink under the page, such as after a search.
    const page = Math.min(this.page, pageCount);
    return html`
      <label class="size">
        ${msg('Rows per page', { id: 'pages.admin.rows-per-page' })}
        <select @change="${this.onPageSize}">
          ${PAGE_SIZES.map(
            (size) =>
              html`<option value="${size}" ?selected="${size === this.pageSize}">${size}</option>`,
          )}
        </select>
      </label>
      <nav class="pages" aria-label="${msg('Pages', { id: 'pages.admin.pages' })}">
        <hb-icon-button
          label="${msg('Previous page', { id: 'pages.admin.previous' })}"
          ?disabled="${page <= 1}"
          @click="${() => this.go(page - 1)}"
        >
          <node-icon name="chevron-left"></node-icon>
        </hb-icon-button>
        <span class="position" role="status">
          ${msg(str`${page} of ${pageCount}`, { id: 'pages.admin.page-of' })}
        </span>
        <hb-icon-button
          label="${msg('Next page', { id: 'pages.admin.next' })}"
          ?disabled="${page >= pageCount}"
          @click="${() => this.go(page + 1)}"
        >
          <node-icon name="chevron-right"></node-icon>
        </hb-icon-button>
      </nav>
    `;
  }

  private go(page: number) {
    this.change({ page, pageSize: this.pageSize });
  }

  private readonly onPageSize = (event: Event) => {
    this.change({ page: 1, pageSize: Number((event.target as HTMLSelectElement).value) });
  };

  private change(detail: PageChange) {
    this.dispatchEvent(new CustomEvent<PageChange>('pagechange', { detail }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-pager': AdminPager;
  }
}
