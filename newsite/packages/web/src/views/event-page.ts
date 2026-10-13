import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../components/hero/hero-block';
import { heroText } from '../components/hero/hero-block';
import { PAGE_TONES } from '../components/hero/simple-hero';
import { eventDate, eventPlace } from '../components/shared/event-card';
import '../components/markdown/short-markdown';
import '../components/shared/node-icon';
import '../components/ui/hb-button';
import '../components/ui/hb-chip';
import type { CommunityEvent } from '../models/event';
import { profile } from '../styles/profile';
import { ThemedComponent } from '../components/themed-component';

const PROVIDER_NAMES = { gdg: 'GDG', luma: 'Luma' } as const;

/** Paragraphs the sync saved on single lines, as markdown needs them: separated by a blank line. */
const paragraphs = (text: string) => text.split('\n').filter((line) => line.trim()).join('\n\n');

/** One event: when and where, the sign-up numbers and ticket types, and a button to RSVP. */
@customElement('event-page')
export class EventPage extends ThemedComponent {
  static override styles = [
    heroText,
    profile,
    css`
      :host {
        display: block;
        background-color: var(--hb-section-background);
        color: var(--hb-color-on-surface);
      }

      .facts {
        display: flex;
        flex-wrap: wrap;
        gap: var(--hb-space-2);
        margin: var(--hb-space-4) 0 0;
        padding: 0;
        list-style: none;
      }

      .category {
        border-radius: 999px;
        font-weight: 600;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--hb-space-3);
        margin-block-start: var(--hb-space-5);
      }

      .cover {
        display: block;
        inline-size: 100%;
        block-size: auto;
        max-block-size: 22rem;
        object-fit: cover;
        outline: none;
        border-radius: var(--hb-radius-l);
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
        gap: var(--hb-space-3);
        margin: var(--hb-space-5) 0 0;
      }

      .stat {
        padding: var(--hb-space-4);
        border: var(--hb-border-width) solid var(--hb-border-color);
        border-radius: var(--hb-radius-m);
        background-color: var(--hb-color-surface-container);
      }

      .stat dt {
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-sm);
      }

      .stat dd {
        margin: var(--hb-space-1) 0 0;
        font-size: var(--hb-text-lg);
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .tickets {
        display: grid;
        gap: var(--hb-space-3);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .ticket {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: var(--hb-space-2) var(--hb-space-5);
        padding: var(--hb-space-4);
        border: var(--hb-border-width) solid var(--hb-border-color);
        border-radius: var(--hb-radius-m);
        background-color: var(--hb-color-surface-container);
      }

      .ticket strong {
        display: block;
      }

      .ticket span {
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-sm);
      }

      .address {
        margin: 0 0 var(--hb-space-3);
        font-style: normal;
      }

      a {
        text-underline-offset: 0.2em;
      }
    `,
  ];

  @property({ attribute: false })
  accessor event!: CommunityEvent;

  override render() {
    const { event } = this;
    const provider = PROVIDER_NAMES[event.provider];
    const place = eventPlace(event);
    const address = [event.venue?.name, event.venue?.address, event.venue?.city, event.venue?.region, event.venue?.postalCode]
      .filter(Boolean)
      .join(', ');
    return html`
      <hero-block tone="${PAGE_TONES.schedule}">
        <a class="back" href="/events">
          <node-icon name="arrow-left"></node-icon>
          All events
        </a>
        <h1 class="hero-title">${event.title}</h1>
        <p class="hero-description">${[eventDate(event), place].filter(Boolean).join(' · ')}</p>
        <ul class="facts">
          <li><hb-chip class="category" accent="1">${event.category}</hb-chip></li>
          ${event.tags.map((tag) => html`<li><hb-chip>${tag}</hb-chip></li>`)}
        </ul>
        <div class="actions">
          <hb-button href="${event.rsvpUrl}" target="_blank" variant="filled" size="l">
            <node-icon slot="icon" name="registration"></node-icon>
            RSVP on ${provider}
          </hb-button>
          ${
            event.hostUrl
              ? html`<hb-button href="${event.hostUrl}" target="_blank" variant="outlined" size="l">
                  <node-icon slot="icon" name="people"></node-icon>
                  ${event.host}
                </hb-button>`
              : nothing
          }
        </div>
      </hero-block>

      <div class="inner">
        ${event.image ? html`<img class="cover" src="${event.image}" alt="${event.title}" width="1280" height="720" />` : nothing}

        <dl class="stats">
          ${event.rsvpCount ? this.stat('Signed up', event.rsvpCount) : nothing}
          ${event.capacity ? this.stat('Capacity', event.capacity) : nothing}
          ${event.format ? this.stat('Format', event.format) : nothing}
          ${event.free !== undefined ? this.stat('Cost', event.free ? 'Free' : 'Paid') : nothing}
          ${event.host ? this.stat('Hosted by', event.host) : nothing}
        </dl>

        ${
          event.tickets.length
            ? html`<h2 class="section-title">Tickets</h2>
                <ul class="tickets">
                  ${event.tickets.map(
                    (ticket) => html`<li class="ticket">
                      <div>
                        <strong>${ticket.title}</strong>
                        ${ticket.kind ? html`<span>${ticket.kind}</span>` : nothing}
                      </div>
                      ${
                        ticket.capacity
                          ? html`<span>${ticket.claimed ?? 0} of ${ticket.capacity} taken</span>`
                          : nothing
                      }
                    </li>`,
                  )}
                </ul>`
            : nothing
        }

        ${
          event.description
            ? html`<h2 class="section-title">About this event</h2>
                <short-markdown class="bio" .content="${paragraphs(event.description)}"></short-markdown>`
            : nothing
        }

        ${
          address
            ? html`<h2 class="section-title">Where</h2>
                <address class="address">${address}</address>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}"
                  target="_blank"
                  rel="noopener"
                  >Open in Google Maps</a
                >`
            : nothing
        }

        <div class="actions">
          <hb-button href="${event.rsvpUrl}" target="_blank" variant="filled" size="l">
            <node-icon slot="icon" name="registration"></node-icon>
            RSVP on ${provider}
          </hb-button>
        </div>
      </div>
    `;
  }

  private stat(label: string, value: string | number) {
    return html`<div class="stat"><dt>${label}</dt><dd>${value}</dd></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'event-page': EventPage;
  }
}
