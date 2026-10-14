import { msg } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AdminPartner } from '../../models/admin-partner';
import { ThemedComponent } from '../themed-component';
import '../ui/hb-chip';

type Tab = 'sponsors' | 'partners';

const TABS: readonly Tab[] = ['sponsors', 'partners'];

/** The Sponsors section of the admin dashboard: a tab for sponsors and one for partners. */
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

    .count {
      margin-inline-start: var(--hb-space-2);
      color: var(--hb-color-on-surface-variant);
      font-weight: 400;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: var(--hb-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .partner {
      display: grid;
      grid-template-rows: auto 1fr;
      overflow: hidden;
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      background-color: var(--hb-panel-background);
      box-shadow: var(--hb-shadow-card);
    }

    .logo {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      aspect-ratio: 16 / 9;
      padding: var(--hb-space-4);
      background-color: var(--hb-color-surface-container);
    }

    .logo {
      min-inline-size: 0;
      overflow: hidden;
    }

    .logo img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: contain;
    }

    .info {
      display: grid;
      align-content: start;
      gap: var(--hb-space-1);
      padding: var(--hb-space-4);
    }

    .name {
      font-weight: 600;
    }

    .info a {
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      overflow-wrap: anywhere;
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
  `;

  @property({ attribute: false })
  accessor partners: AdminPartner[] = [];

  @state()
  private accessor tab: Tab = 'sponsors';

  private label(tab: Tab) {
    return tab === 'sponsors'
      ? msg('Sponsors', { id: 'pages.admin.tab-sponsors' })
      : msg('Partners', { id: 'pages.admin.tab-partners' });
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
              @click="${() => (this.tab = tab)}"
              @keydown="${this.onKeydown}"
            >
              ${this.label(tab)}
              ${
                tab === 'partners'
                  ? html`<span class="count">${this.partners.length}</span>`
                  : nothing
              }
            </button>`,
        )}
      </div>
      <div role="tabpanel" id="panel-${this.tab}" aria-labelledby="tab-${this.tab}">
        ${this.tab === 'sponsors' ? this.renderSponsors() : this.renderPartners()}
      </div>
    `;
  }

  // Arrow keys move between the tabs, as a tab list does.
  private readonly onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.tab = this.tab === 'sponsors' ? 'partners' : 'sponsors';
    void this.updateComplete.then(() =>
      this.shadowRoot?.querySelector<HTMLElement>(`#tab-${this.tab}`)?.focus(),
    );
  };

  private renderSponsors() {
    return html`<div class="empty">
      <hb-chip>${msg('Coming soon', { id: 'pages.admin.soon' })}</hb-chip>
      <p>
        ${msg('There are no sponsors yet. They will be listed here once NODE has some.', {
          id: 'pages.admin.sponsors-none',
        })}
      </p>
    </div>`;
  }

  private renderPartners() {
    if (!this.partners.length) {
      return html`<p class="empty">
        ${msg('There are no partners yet.', { id: 'pages.admin.partners-none' })}
      </p>`;
    }
    return html`<ul class="grid">
      ${this.partners.map(
        (partner) =>
          html`<li class="partner">
            <div class="logo">
              ${
                partner.logoUrl
                  ? html`<img
                      src="${partner.logoUrl}"
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                    />`
                  : nothing
              }
            </div>
            <div class="info">
              <span class="name">${partner.name}</span>
              ${
                partner.websiteUrl
                  ? html`<a href="${partner.websiteUrl}" target="_blank" rel="noopener noreferrer"
                      >${partner.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}</a
                    >`
                  : nothing
              }
            </div>
          </li>`,
      )}
    </ul>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-sponsors': AdminSponsors;
  }
}
