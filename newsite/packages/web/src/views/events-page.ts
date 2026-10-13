import { msg, str } from '@lit/localize';
import { css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../components/hero/simple-hero';
import '../components/shared/event-card';
import '../components/shared/filter-menu';
import '../components/ui/hb-switch';
import type { HbSwitch } from '../components/ui/hb-switch';
import type { CommunityEvent } from '../models/event';
import type { Filter } from '../models/filter';
import { type FilterGroup, FilterGroupKey } from '../models/filter-group';
import { displayFont } from '../styles/shared';
import { selectFilters } from '../store/filters';
import { loadLocalTime, selectLocalTime, setLocalTime } from '../store/ui';
import { timeZone } from '../config/site';
import { PageMetadataController } from '../controllers/page-metadata-controller';
import { fromStore } from '../controllers/from-store';
import { ThemedComponent } from '../components/themed-component';

/** IANA names such as `America/New_York`, as people read them. */
const zoneName = (zone: string) => zone.replaceAll('_', ' ');

/**
 * The events page: Upcoming events in one column per category under the time zone and the filters,
 * then Past events as cards. Both come from the events the site synced from GDG and Luma.
 */
@customElement('events-page')
export class EventsPage extends ThemedComponent {
  static override styles = css`
    :host {
      display: block;
      background-color: var(--hb-section-background);
      color: var(--hb-color-on-surface);
    }

    /* Content-box, so the text column lines up with the hero's. */
    .inner {
      box-sizing: content-box;
      max-inline-size: var(--hb-content-max);
      margin-inline: auto;
      padding: 0 var(--hb-gutter) var(--hb-space-9);
      container-type: inline-size;
    }

    .title {
      margin: 0;
      padding-block: var(--hb-space-7) 0;
      ${displayFont('display', '2xl', 1.15)};
    }

    .title.past {
      padding-block-start: var(--hb-space-9);
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--hb-space-3) var(--hb-space-5);
      padding-block: var(--hb-space-5) var(--hb-space-3);
    }

    .zone {
      margin: 0;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }

    .zone strong {
      color: var(--hb-color-on-surface);
      font-family: var(--hb-font-mono);
      font-weight: 600;
    }

    filter-menu {
      flex-basis: 100%;
    }

    /* One column per category, headed like the schedule's rooms. */
    .columns {
      display: grid;
      grid-template-columns: repeat(var(--columns, 3), minmax(0, 1fr));
      gap: 0 var(--hb-space-5);
      margin-block-start: var(--hb-space-3);
    }

    .column {
      display: grid;
      align-content: start;
      gap: var(--hb-space-4);
      min-inline-size: 0;
    }

    .column-title {
      margin: 0 0 var(--hb-space-2);
      padding: var(--hb-space-3) 0;
      border-block-end: 2px solid var(--hb-color-on-surface);
      ${displayFont('heading', 'lg', 1.2)};
      text-align: center;
    }

    .column-empty {
      margin: 0;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      text-align: center;
    }

    .events {
      display: grid;
      grid-template-columns: repeat(
        auto-fill,
        minmax(min(100%, 19rem * var(--hb-card-scale, 1)), 1fr)
      );
      gap: var(--hb-space-5);
      margin: var(--hb-space-5) 0 0;
      padding: 0;
      list-style: none;
    }

    .events > li {
      display: grid;
    }

    @container (width < 760px) {
      .columns {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--hb-space-5) 0;
      }
    }

    @container (width < 480px) {
      .events {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--hb-space-3);
      }
    }

    .empty {
      margin: var(--hb-space-5) 0 0;
      color: var(--hb-color-on-surface-variant);
    }
  `;

  @property({ attribute: false })
  accessor upcoming: CommunityEvent[] = [];

  @property({ attribute: false })
  accessor past: CommunityEvent[] = [];

  /** The filters, in order. */
  @property({ attribute: false })
  accessor categories: string[] = [];

  @fromStore((state) => selectFilters(state))
  private accessor selectedFilters!: Filter[];
  @fromStore((state) => selectLocalTime(state))
  private accessor localTime!: boolean;

  // The visitor's time zone, known only in the browser. The switch shows when it differs.
  @state()
  private accessor visitorTimeZone: string | undefined;

  private readonly metadata = new PageMetadataController(this, 'schedule');

  override firstUpdated() {
    this.visitorTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    loadLocalTime();
  }

  override updated(changed: PropertyValues<this>) {
    if (changed.has('upcoming')) this.metadata.update();
  }

  private get filterGroups(): FilterGroup[] {
    return [
      {
        key: FilterGroupKey.tags,
        filters: this.categories.map((tag) => ({ group: FilterGroupKey.tags, tag })),
      },
    ];
  }

  /** The categories to show: the chosen filters, or all of them. */
  private get shownCategories() {
    const chosen = this.selectedFilters
      .filter(({ group }) => group === FilterGroupKey.tags)
      .map(({ tag }) => tag);
    return chosen.length ? this.categories.filter((category) => chosen.includes(category)) : this.categories;
  }

  private columns(zone: string) {
    const categories = this.shownCategories;
    return html`<div class="columns" style="--columns: ${Math.max(categories.length, 1)}">
      ${categories.map((category) => {
        const events = this.upcoming.filter((event) => event.category === category);
        return html`<section class="column">
          <h3 class="column-title">${category}</h3>
          ${
            events.length
              ? events.map((event) => html`<event-card .event="${event}" zone="${zone}"></event-card>`)
              : html`<p class="column-empty">${msg('Nothing planned yet.', { id: 'events.page.column-empty' })}</p>`
          }
        </section>`;
      })}
    </div>`;
  }

  private cards(events: CommunityEvent[], zone: string) {
    return html`<ul class="events">
      ${events.map(
        (event) =>
          html`<li><event-card .event="${event}" zone="${zone}"></event-card></li>`,
      )}
    </ul>`;
  }

  override render() {
    const visitorZone = this.visitorTimeZone;
    const otherZone = !!visitorZone && visitorZone !== timeZone;
    const shownZone = this.localTime && otherZone ? visitorZone : timeZone;
    return html`
      <simple-hero page="schedule"></simple-hero>

      <div class="inner">
        <h2 class="title">${msg('Upcoming events', { id: 'events.page.upcoming' })}</h2>

        <div class="toolbar">
          <p class="zone">
            ${msg(html`Times in <strong>${zoneName(shownZone)}</strong>`, {
              id: 'schedule.page.time-zone',
            })}
          </p>
          ${
            otherZone
              ? html`<hb-switch .checked="${this.localTime}" @change="${this.onLocalTimeChange}">
                  ${msg(str`Show my time zone, ${zoneName(visitorZone)}`, {
                    id: 'schedule.page.local-time',
                  })}
                </hb-switch>`
              : nothing
          }
          <filter-menu
            .filterGroups="${this.filterGroups}"
            .selectedFilters="${this.selectedFilters}"
          ></filter-menu>
        </div>

        ${this.columns(shownZone)}

        ${
          this.past.length
            ? html`<h2 class="title past">${msg('Past events', { id: 'events.page.past' })}</h2>
                ${this.cards(this.past, shownZone)}`
            : nothing
        }
      </div>
    `;
  }

  private readonly onLocalTimeChange = (event: Event) => {
    setLocalTime((event.target as HbSwitch).checked);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'events-page': EventsPage;
  }
}
