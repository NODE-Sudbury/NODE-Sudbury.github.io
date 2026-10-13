import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { CommunityEvent } from '../../models/event';
import { displayFont } from '../../styles/shared';
import { eventPath } from '../../utils/navigation';
import { tagChipStyle } from '../../utils/styles';
import { ThemedComponent } from '../themed-component';
import '../ui/hb-card';
import '../ui/hb-chip';

const MAX_TAGS = 6;

/** "Sat, Nov 28, 2026, 8:30 a.m." in the given time zone, else the event's own. */
export const eventDate = (event: Pick<CommunityEvent, 'start' | 'timezone'>, zone?: string) =>
  new Date(event.start).toLocaleString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: zone ?? event.timezone,
  });

/** "Collège Boréal - Sudbury, Greater Sudbury", "Online", or nothing when the venue is unknown. */
export const eventPlace = (event: Pick<CommunityEvent, 'venue' | 'online' | 'format'>) => {
  const place = [event.venue?.name, event.venue?.city].filter(Boolean).join(', ');
  if (event.format === 'Hybrid') return place ? `${place} and online` : 'Hybrid';
  return event.online ? 'Online' : place;
};

/**
 * An event as one link to its page: cover image, title, date and place, a short summary, its tags
 * and how many people signed up. In a container narrower than 480px it is a compact row.
 */
@customElement('event-card')
export class EventCard extends ThemedComponent {
  static override styles = css`
    :host {
      display: block;
    }

    hb-card {
      block-size: 100%;
    }

    .content {
      display: flex;
      flex-direction: column;
      block-size: 100%;
    }

    .cover {
      flex: none;
      outline: none;
      border-radius: var(--hb-radius-l) var(--hb-radius-l) 0 0;
      inline-size: 100%;
      block-size: auto;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      background-color: var(--hb-color-accent-1-container);
    }

    .text {
      display: grid;
      flex: 1;
      align-content: start;
      gap: var(--hb-space-2);
      min-inline-size: 0;
      padding: var(--hb-space-4) var(--hb-space-5) var(--hb-space-5);
    }

    .name {
      margin: 0;
      padding: 0;
      ${displayFont('heading', 'lg', 1.2)};
      overflow-wrap: anywhere;
    }

    .meta,
    .stats {
      margin: 0;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }

    .summary {
      display: -webkit-box;
      margin: 0;
      overflow: hidden;
      font-size: var(--hb-text-sm);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      line-clamp: 3;
    }

    .category {
      justify-self: start;
      margin: var(--hb-space-1) 0 0;
    }

    .pill {
      display: inline-block;
      padding: var(--hb-space-1) var(--hb-space-4);
      border-radius: 999px;
      background-color: var(--hb-color-accent-1-container);
      color: var(--hb-color-on-accent-1-container);
      font-size: var(--hb-text-sm);
      font-weight: 700;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--hb-space-2);
      margin: var(--hb-space-1) 0 0;
      padding: 0;
      list-style: none;
    }

    @container (width < 480px) {
      .content {
        flex-direction: row;
        align-items: center;
      }

      .cover {
        inline-size: 7rem;
        block-size: auto;
        aspect-ratio: 1;
        border-radius: var(--hb-radius-l) 0 0 var(--hb-radius-l);
      }

      .text {
        padding: var(--hb-space-3) var(--hb-space-4);
      }
    }
  `;

  @property({ attribute: false })
  accessor event!: CommunityEvent;

  /** The time zone to show the start in. Defaults to the event's own. */
  @property()
  accessor zone: string | undefined;

  /** The name's heading level: 2 right under the page title, 3 under a section heading. */
  @property({ type: Number, attribute: 'heading-level' })
  accessor headingLevel: 2 | 3 = 3;

  override render() {
    const { event } = this;
    const place = eventPlace(event);
    const meta = [eventDate(event, this.zone), place].filter(Boolean).join(' · ');
    const tags = [...new Set(event.tags)].slice(0, MAX_TAGS);
    const stats = [
      event.rsvpCount
        ? `${event.rsvpCount} ${event.rsvpCount === 1 ? 'person' : 'people'} signed up`
        : '',
      event.host ? `Hosted by ${event.host}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    return html`
      <hb-card href="${eventPath(event)}" label="${event.title}">
        <div class="content">
          ${event.image ? html`<img class="cover" src="${event.image}" alt="${event.title}" width="640" height="360" loading="lazy" />` : nothing}
          <div class="text">
            ${
              this.headingLevel === 2
                ? html`<h2 class="name">${event.title}</h2>`
                : html`<h3 class="name">${event.title}</h3>`
            }
            <p class="meta">${meta}</p>
            ${event.summary ? html`<p class="summary">${event.summary}</p>` : nothing}
            ${
              tags.length
                ? html`<ul class="tags">
                    ${tags.map(
                      (tag) =>
                        html`<li>
                          <hb-chip
                            style="${Object.entries(tagChipStyle(tag))
                              .map(([key, value]) => `${key}:${value}`)
                              .join(';')}"
                            >${tag}</hb-chip
                          >
                        </li>`,
                    )}
                  </ul>`
                : nothing
            }
            <p class="category"><span class="pill">${event.category}</span></p>
            ${stats ? html`<p class="stats">${stats}</p>` : nothing}
          </div>
        </div>
      </hb-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'event-card': EventCard;
  }
}
