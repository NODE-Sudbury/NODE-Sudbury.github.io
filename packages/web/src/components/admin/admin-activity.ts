import { msg, str } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fetchActivity } from '../../db/admin-activity';
import type { ActivityAction, ActivityEntry } from '../../models/activity';
import { ThemedComponent } from '../themed-component';
import '../shared/node-icon';
import '../ui/hb-chip';
import '../ui/hb-icon-button';
import '../ui/hb-progress';
import '../ui/hb-text-field';
import type { HbTextField } from '../ui/hb-text-field';

/** How many entries a page can show. The first is the default, as in the members table. */
const PAGE_SIZES = [10, 30, 50] as const;

const ACTIONS: readonly ActivityAction[] = ['insert', 'update', 'delete'];
const TABLES = [
  'admins',
  'board_members',
  'partners',
  'sponsors',
  'members',
  'subscribers',
  'site_settings',
] as const;

const actionLabel = (action: ActivityAction) =>
  ({
    insert: msg('Added', { id: 'pages.admin.action-insert' }),
    update: msg('Changed', { id: 'pages.admin.action-update' }),
    delete: msg('Deleted', { id: 'pages.admin.action-delete' }),
  })[action];

const tableLabel = (table: string) =>
  (
    ({
      admins: msg('Team access', { id: 'pages.admin.table-admins' }),
      board_members: msg('Board card', { id: 'pages.admin.table-board' }),
      partners: msg('Partner', { id: 'pages.admin.table-partners' }),
      sponsors: msg('Sponsor', { id: 'pages.admin.table-sponsors' }),
      members: msg('Member', { id: 'pages.admin.table-members' }),
      subscribers: msg('Subscriber', { id: 'pages.admin.table-subscribers' }),
      site_settings: msg('Site setting', { id: 'pages.admin.table-settings' }),
    }) as Record<string, string>
  )[table] ?? table;

const when = (at: string) =>
  at
    ? new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(at),
      )
    : '';

/** A value from the log in a short readable form. */
const show = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return msg('(empty)', { id: 'pages.admin.empty-value' });
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
};

/** The lines for the details of an entry: what a field was and became, or what a new row held. */
const detailLines = (entry: ActivityEntry): string[] =>
  Object.entries(entry.changes).map(([field, change]) => {
    if (
      entry.action === 'update' &&
      change &&
      typeof change === 'object' &&
      'from' in change &&
      'to' in change
    ) {
      const { from, to } = change as { from: unknown; to: unknown };
      return `${field}: ${show(from)} -> ${show(to)}`;
    }
    return `${field}: ${show(change)}`;
  });

/**
 * The Activity tab of Settings: who added, changed or deleted what, newest first, with filters and
 * pages. Only the super admin can read the log, and nobody can change it.
 */
@customElement('admin-activity')
export class AdminActivity extends ThemedComponent {
  static override styles = css`
    :host {
      display: grid;
      gap: var(--hb-space-4);
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: var(--hb-space-4);
    }

    .filters hb-text-field {
      flex: 1 1 14rem;
    }

    label.select {
      display: grid;
      gap: var(--hb-space-1);
      font-weight: 600;
    }

    select {
      min-block-size: var(--hb-target-min);
      padding: var(--hb-space-1) var(--hb-space-3);
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-control);
      background-color: var(--hb-color-surface-container);
      color: inherit;
      font: inherit;
      font-weight: 400;
    }

    .summary,
    .note {
      margin: 0;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }

    .scroll {
      overflow-x: auto;
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      background-color: var(--hb-panel-background);
    }

    table {
      inline-size: 100%;
      min-inline-size: 48rem;
      border-collapse: collapse;
    }

    th,
    td {
      padding: var(--hb-space-3) var(--hb-space-4);
      border-block-end: var(--hb-border-width) solid var(--hb-border-color);
      text-align: start;
      vertical-align: top;
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

    .muted {
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      overflow-wrap: anywhere;
    }

    .what {
      display: grid;
      gap: var(--hb-space-1);
    }

    .what-name {
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    details summary {
      cursor: pointer;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }

    details ul {
      margin: var(--hb-space-2) 0 0;
      padding-inline-start: var(--hb-space-5);
      font-family: var(--hb-font-mono);
      font-size: var(--hb-text-sm);
      overflow-wrap: anywhere;
    }

    .pager {
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

    .position {
      min-inline-size: 4rem;
      text-align: center;
      font-weight: 600;
    }

    .empty {
      margin: 0;
      padding: var(--hb-space-6);
      border: var(--hb-border-width) dashed var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      color: var(--hb-color-on-surface-variant);
    }
  `;

  @state()
  private accessor entries: ActivityEntry[] = [];
  @state()
  private accessor loading = true;
  @state()
  private accessor failed = false;
  @state()
  private accessor query = '';
  @state()
  private accessor table = '';
  @state()
  private accessor action = '';
  @state()
  private accessor pageSize: number = PAGE_SIZES[0];
  // Counted from 1.
  @state()
  private accessor page = 1;

  override async firstUpdated() {
    try {
      this.entries = await fetchActivity();
    } catch {
      this.failed = true;
    } finally {
      this.loading = false;
    }
  }

  private get shown(): ActivityEntry[] {
    const words = this.query.toLowerCase().split(/\s+/).filter(Boolean);
    return this.entries.filter((entry) => {
      if (this.table && entry.table !== this.table) return false;
      if (this.action && entry.action !== this.action) return false;
      const text = [entry.actorEmail, entry.summary, tableLabel(entry.table)]
        .join(' ')
        .toLowerCase();
      return words.every((word) => text.includes(word));
    });
  }

  private get pageCount(): number {
    return Math.max(1, Math.ceil(this.shown.length / this.pageSize));
  }

  override render() {
    if (this.loading) return html`<hb-progress></hb-progress>`;
    const { shown } = this;
    const page = Math.min(this.page, this.pageCount);
    const start = (page - 1) * this.pageSize;
    return html`
      <div class="filters">
        <hb-text-field
          type="search"
          name="search"
          label="${msg('Search the activity', { id: 'pages.admin.activity-search' })}"
          .value="${this.query}"
          @input="${this.onSearch}"
        ></hb-text-field>
        <label class="select">
          ${msg('What', { id: 'pages.admin.filter-table' })}
          <select name="table" @change="${this.onTable}">
            <option value="">${msg('Everything', { id: 'pages.admin.filter-all' })}</option>
            ${TABLES.map(
              (table) =>
                html`<option value="${table}" ?selected="${table === this.table}">
                  ${tableLabel(table)}
                </option>`,
            )}
          </select>
        </label>
        <label class="select">
          ${msg('Action', { id: 'pages.admin.filter-action' })}
          <select name="action" @change="${this.onAction}">
            <option value="">${msg('Any action', { id: 'pages.admin.filter-any' })}</option>
            ${ACTIONS.map(
              (action) =>
                html`<option value="${action}" ?selected="${action === this.action}">
                  ${actionLabel(action)}
                </option>`,
            )}
          </select>
        </label>
      </div>
      <p class="summary" role="status">
        ${
          this.failed
            ? msg('The activity could not be loaded. Please, try again later.', {
                id: 'pages.admin.activity-failed',
              })
            : msg(str`${shown.length} of ${this.entries.length} entries`, {
                id: 'pages.admin.activity-count',
              })
        }
      </p>
      <p class="note">
        ${msg('The log shows the latest entries. Nobody can change or delete it.', {
          id: 'pages.admin.activity-note',
        })}
      </p>
      ${
        shown.length
          ? html`${this.renderTable(shown.slice(start, start + this.pageSize))}
            ${this.renderPager(page)}`
          : html`<p class="empty">
              ${
                this.entries.length
                  ? msg('Nothing matches your search.', { id: 'pages.admin.org-none-match' })
                  : msg('Nothing has been logged yet.', { id: 'pages.admin.activity-none' })
              }
            </p>`
      }
    `;
  }

  private renderTable(list: ActivityEntry[]) {
    return html`<div class="scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">${msg('When', { id: 'pages.admin.col-when' })}</th>
            <th scope="col">${msg('Who', { id: 'pages.admin.col-who' })}</th>
            <th scope="col">${msg('Action', { id: 'pages.admin.filter-action' })}</th>
            <th scope="col">${msg('What', { id: 'pages.admin.filter-table' })}</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((entry) => this.renderRow(entry))}
        </tbody>
      </table>
    </div>`;
  }

  private renderRow(entry: ActivityEntry) {
    const lines = detailLines(entry);
    return html`<tr>
      <td class="muted">${when(entry.at)}</td>
      <td>
        <div class="what">
          <span>${entry.actorEmail || msg('The system', { id: 'pages.admin.system' })}</span>
          ${entry.actorRole ? html`<span class="muted">${entry.actorRole}</span>` : nothing}
        </div>
      </td>
      <td>
        <hb-chip
          accent="${entry.action === 'delete' ? '2' : entry.action === 'insert' ? '4' : '1'}"
        >
          ${actionLabel(entry.action)}
        </hb-chip>
      </td>
      <td>
        <div class="what">
          <span class="what-name">${tableLabel(entry.table)}: ${entry.summary}</span>
          ${
            lines.length
              ? html`<details>
                  <summary>${msg('Details', { id: 'pages.admin.details' })}</summary>
                  <ul>
                    ${lines.map((line) => html`<li>${line}</li>`)}
                  </ul>
                </details>`
              : nothing
          }
        </div>
      </td>
    </tr>`;
  }

  private renderPager(page: number) {
    const { pageCount } = this;
    return html`<div class="pager">
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
          @click="${() => (this.page = page - 1)}"
        >
          <node-icon name="chevron-left"></node-icon>
        </hb-icon-button>
        <span class="position" role="status">
          ${msg(str`${page} of ${pageCount}`, { id: 'pages.admin.page-of' })}
        </span>
        <hb-icon-button
          label="${msg('Next page', { id: 'pages.admin.next' })}"
          ?disabled="${page >= pageCount}"
          @click="${() => (this.page = page + 1)}"
        >
          <node-icon name="chevron-right"></node-icon>
        </hb-icon-button>
      </nav>
    </div>`;
  }

  private readonly onSearch = (event: Event) => {
    this.query = (event.target as HbTextField).value;
    this.page = 1;
  };

  private readonly onTable = (event: Event) => {
    this.table = (event.target as HTMLSelectElement).value;
    this.page = 1;
  };

  private readonly onAction = (event: Event) => {
    this.action = (event.target as HTMLSelectElement).value;
    this.page = 1;
  };

  private readonly onPageSize = (event: Event) => {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.page = 1;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-activity': AdminActivity;
  }
}
