import { msg, str } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { deleteOrganization, fetchOrganizations } from '../../db/admin-organizations';
import type { Organization, OrganizationKind, SponsorTier } from '../../models/organization';
import { store } from '../../store';
import { queueSnackbar } from '../../store/snackbars';
import { ThemedComponent } from '../themed-component';
import '../ui/hb-button';
import '../ui/hb-chip';
import '../ui/hb-dialog';
import '../ui/hb-progress';
import '../ui/hb-text-field';
import type { HbTextField } from '../ui/hb-text-field';

const TABS: readonly OrganizationKind[] = ['sponsor', 'partner'];

/** The page that adds a sponsor or partner. It goes back to the list's tab afterwards. */
const addHref = (kind: OrganizationKind) =>
  `/admin/sponsors/new?kind=${kind}${kind === 'partner' ? '&tab=partners' : ''}`;

/** The page that changes one. */
const editHref = ({ kind, id }: Pick<Organization, 'kind' | 'id'>) =>
  `/admin/sponsors/edit?kind=${kind}&id=${id}${kind === 'partner' ? '&tab=partners' : ''}`;

const tierLabel = (tier: SponsorTier) =>
  ({
    platinum: msg('Platinum', { id: 'pages.admin.tier-platinum' }),
    gold: msg('Gold', { id: 'pages.admin.tier-gold' }),
    silver: msg('Silver', { id: 'pages.admin.tier-silver' }),
    bronze: msg('Bronze', { id: 'pages.admin.tier-bronze' }),
    community: msg('Community', { id: 'pages.admin.tier-community' }),
  })[tier];

/** The Sponsors section of the admin dashboard: a table of sponsors and one of partners. */
@customElement('admin-sponsors')
export class AdminSponsors extends ThemedComponent {
  static override styles = css`
    :host {
      display: grid;
      gap: var(--hb-space-5);
    }

    [role='tablist'] {
      display: flex;
      gap: var(--hb-space-2);
      border-block-end: var(--hb-border-width) solid var(--hb-border-color);
    }

    [role='tab'] {
      min-block-size: var(--hb-target-min);
      padding: var(--hb-space-2) var(--hb-space-5);
      border: 0;
      border-block-end: 3px solid transparent;
      background: none;
      color: var(--hb-color-on-surface-variant);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    [role='tab']:hover {
      background-color: color-mix(in srgb, currentColor 8%, transparent);
    }

    [role='tab'][aria-selected='true'] {
      border-block-end-color: var(--hb-color-primary);
      color: var(--hb-color-primary);
    }

    /* The bar, the search box and the table, with room between them. */
    [role='tabpanel'] {
      display: grid;
      gap: var(--hb-space-4);
    }

    .count {
      margin-inline-start: var(--hb-space-2);
      color: var(--hb-color-on-surface-variant);
      font-weight: 400;
    }

    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--hb-space-3);
    }

    .summary {
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
      min-inline-size: 40rem;
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

    .thumb {
      display: grid;
      inline-size: 4.5rem;
      block-size: 2.75rem;
      overflow: hidden;
      border-radius: var(--hb-radius-m);
      background-color: var(--hb-color-surface-container);
    }

    .thumb img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: contain;
    }

    .name {
      font-weight: 600;
    }

    .site {
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      overflow-wrap: anywhere;
    }

    .site a {
      color: inherit;
    }

    .row-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--hb-space-2);
    }

    .empty {
      display: grid;
      justify-items: start;
      gap: var(--hb-space-3);
      margin: 0;
      padding: var(--hb-space-6);
      border: var(--hb-border-width) dashed var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      color: var(--hb-color-on-surface-variant);
    }

    .empty p {
      margin: 0;
    }

    .confirm p {
      margin: 0;
    }

    .visually-hidden {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `;

  @state()
  private accessor tab: OrganizationKind = 'sponsor';
  @state()
  private accessor sponsors: Organization[] = [];
  @state()
  private accessor partners: Organization[] = [];
  @state()
  private accessor loading = true;
  @state()
  private accessor failed = false;
  // The organization the visitor asked to delete, until they confirm or cancel.
  @state()
  private accessor deleting: Organization | undefined;
  @state()
  private accessor busy = false;
  @state()
  private accessor query = '';

  override async firstUpdated() {
    // A link can open the Partners tab, such as after adding one.
    if (new URLSearchParams(window.location.search).get('tab') === 'partners') {
      this.tab = 'partner';
    }
    try {
      [this.sponsors, this.partners] = await Promise.all([
        fetchOrganizations('sponsor'),
        fetchOrganizations('partner'),
      ]);
    } catch {
      this.failed = true;
    } finally {
      this.loading = false;
    }
  }

  private get list(): Organization[] {
    return this.tab === 'sponsor' ? this.sponsors : this.partners;
  }

  /** The organizations of this tab that match every word typed in the search box. */
  private get shown(): Organization[] {
    const words = this.query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return this.list;
    return this.list.filter(({ name, websiteUrl, tier }) => {
      const text = [name, websiteUrl, tier ? tierLabel(tier) : ''].join(' ').toLowerCase();
      return words.every((word) => text.includes(word));
    });
  }

  private readonly onSearch = (event: Event) => {
    this.query = (event.target as HbTextField).value;
  };

  private selectTab(tab: OrganizationKind) {
    this.tab = tab;
    this.query = '';
  }

  private label(kind: OrganizationKind, plural = true) {
    return kind === 'sponsor'
      ? plural
        ? msg('Sponsors', { id: 'pages.admin.tab-sponsors' })
        : msg('sponsor', { id: 'pages.admin.kind-sponsor' })
      : plural
        ? msg('Partners', { id: 'pages.admin.tab-partners' })
        : msg('partner', { id: 'pages.admin.kind-partner' });
  }

  override render() {
    return html`
      <div role="tablist" aria-label="${msg('Sponsors and partners', { id: 'pages.admin.tabs' })}">
        ${TABS.map(
          (tab) =>
            html`<button
              role="tab"
              type="button"
              id="tab-${tab}"
              aria-selected="${tab === this.tab}"
              aria-controls="panel-${tab}"
              tabindex="${tab === this.tab ? 0 : -1}"
              @click="${() => this.selectTab(tab)}"
              @keydown="${this.onKeydown}"
            >
              ${this.label(tab)}
              <span class="count"
                >${tab === 'sponsor' ? this.sponsors.length : this.partners.length}</span
              >
            </button>`,
        )}
      </div>
      <div role="tabpanel" id="panel-${this.tab}" aria-labelledby="tab-${this.tab}">
        ${this.loading ? html`<hb-progress></hb-progress>` : this.renderPanel()}
      </div>
      ${this.renderDeleteDialog()}
    `;
  }

  // Arrow keys move between the tabs, as a tab list does.
  private readonly onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.selectTab(this.tab === 'sponsor' ? 'partner' : 'sponsor');
    void this.updateComplete.then(() =>
      this.shadowRoot?.querySelector<HTMLElement>(`#tab-${this.tab}`)?.focus(),
    );
  };

  private renderPanel() {
    const { tab, list, shown } = this;
    return html`
      <div class="bar">
        <p class="summary" role="status">
          ${
            this.failed
              ? msg('The list could not be loaded. Please, try again later.', {
                  id: 'pages.admin.org-failed',
                })
              : this.query
                ? msg(str`${shown.length} of ${list.length} ${this.label(tab)}`, {
                    id: 'pages.admin.org-filtered',
                  })
                : msg(str`${list.length} ${this.label(tab)}`, { id: 'pages.admin.org-total' })
          }
        </p>
        <hb-button href="${addHref(tab)}">
          ${
            tab === 'sponsor'
              ? msg('Add sponsor', { id: 'pages.admin.add-sponsor' })
              : msg('Add partner', { id: 'pages.admin.add-partner' })
          }
        </hb-button>
      </div>
      ${
        list.length
          ? html`<hb-text-field
                type="search"
                name="search"
                label="${
                  tab === 'sponsor'
                    ? msg('Search sponsors', { id: 'pages.admin.search-sponsors' })
                    : msg('Search partners', { id: 'pages.admin.search-partners' })
                }"
                .value="${this.query}"
                @input="${this.onSearch}"
              ></hb-text-field>
              ${
                shown.length
                  ? this.renderTable(shown)
                  : html`<p class="empty">
                      ${msg('Nothing matches your search.', { id: 'pages.admin.org-none-match' })}
                    </p>`
              }`
          : this.renderEmpty()
      }
    `;
  }

  private renderEmpty() {
    return html`<div class="empty">
      <p>
        ${
          this.tab === 'sponsor'
            ? msg('There are no sponsors yet.', { id: 'pages.admin.sponsors-none' })
            : msg('There are no partners yet.', { id: 'pages.admin.partners-none' })
        }
      </p>
    </div>`;
  }

  private renderTable(list: Organization[]) {
    const sponsors = this.tab === 'sponsor';
    return html`<div class="scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">${msg('Logo', { id: 'pages.admin.col-logo' })}</th>
            <th scope="col">${msg('Name', { id: 'pages.account.name' })}</th>
            <th scope="col">${msg('Website', { id: 'pages.account.website' })}</th>
            ${
              sponsors
                ? html`<th scope="col">${msg('Tier', { id: 'pages.admin.col-tier' })}</th>`
                : nothing
            }
            <th scope="col"><span class="visually-hidden"></span></th>
          </tr>
        </thead>
        <tbody>
          ${list.map((organization) => this.renderRow(organization, sponsors))}
        </tbody>
      </table>
    </div>`;
  }

  private renderRow(organization: Organization, sponsors: boolean) {
    const { name, websiteUrl, logoUrl, tier } = organization;
    return html`<tr>
      <td>
        <span class="thumb">
          ${
            logoUrl
              ? html`<img
                  src="${logoUrl}"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                />`
              : nothing
          }
        </span>
      </td>
      <td class="name">${name}</td>
      <td class="site">
        ${
          websiteUrl
            ? html`<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer"
                >${websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}</a
              >`
            : nothing
        }
      </td>
      ${
        sponsors
          ? html`<td>${tier ? html`<hb-chip>${tierLabel(tier)}</hb-chip>` : nothing}</td>`
          : nothing
      }
      <td>
        <div class="row-actions">
          <hb-button variant="outlined" href="${editHref(organization)}">
            ${msg('Edit', { id: 'pages.account.edit' })}
            <span class="visually-hidden">${name}</span>
          </hb-button>
          <hb-button variant="text" @click="${() => (this.deleting = organization)}">
            ${msg('Delete', { id: 'pages.admin.delete' })}
            <span class="visually-hidden">${name}</span>
          </hb-button>
        </div>
      </td>
    </tr>`;
  }

  private renderDeleteDialog() {
    const { deleting } = this;
    return html`<hb-dialog
      heading="${deleting ? msg(str`Delete ${deleting.name}?`, { id: 'pages.admin.delete-title' }) : ''}"
      ?open="${deleting !== undefined}"
      @close="${this.cancelDelete}"
    >
      <div class="confirm">
        <p>
          ${msg('It is removed from the list and its logo is deleted. This cannot be undone.', {
            id: 'pages.admin.delete-body',
          })}
        </p>
      </div>
      <div slot="actions">
        <hb-button variant="text" ?disabled="${this.busy}" @click="${this.cancelDelete}">
          ${msg('Cancel', { id: 'pages.account.cancel' })}
        </hb-button>
        <hb-button ?disabled="${this.busy}" @click="${this.confirmDelete}">
          ${
            this.busy
              ? msg('Deleting...', { id: 'pages.admin.deleting' })
              : msg('Delete', { id: 'pages.admin.delete' })
          }
        </hb-button>
      </div>
    </hb-dialog>`;
  }

  private readonly cancelDelete = () => {
    if (!this.busy) this.deleting = undefined;
  };

  private readonly confirmDelete = async () => {
    const { deleting } = this;
    if (!deleting || this.busy) return;
    this.busy = true;
    try {
      await deleteOrganization(deleting);
      if (deleting.kind === 'sponsor') {
        this.sponsors = this.sponsors.filter(({ id }) => id !== deleting.id);
      } else {
        this.partners = this.partners.filter(({ id }) => id !== deleting.id);
      }
      this.deleting = undefined;
      store.dispatch(queueSnackbar(msg('Deleted.', { id: 'pages.admin.deleted' })));
    } catch {
      store.dispatch(
        queueSnackbar(
          msg('An error has occurred. Please, try again later.', { id: 'common.general-error' }),
        ),
      );
    } finally {
      this.busy = false;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-sponsors': AdminSponsors;
  }
}
