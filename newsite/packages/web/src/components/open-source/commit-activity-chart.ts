import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { WeeklyCommits } from '../../models/open-source';
import { ThemedComponent } from '../themed-component';

const label = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-CA', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** Commits per week over the last year, as a bar chart with a text summary for screen readers. */
@customElement('commit-activity-chart')
export class CommitActivityChart extends ThemedComponent {
  static override styles = css`
    :host {
      display: block;
    }

    .chart {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      block-size: 120px;
    }

    .week {
      flex: 1;
      min-inline-size: 0;
      min-block-size: 3px;
      border-radius: 2px;
      background-color: var(--hb-color-accent-3);
    }

    .week.none {
      background-color: var(--hb-color-surface-container);
    }

    .axis {
      display: flex;
      justify-content: space-between;
      gap: var(--hb-space-3);
      margin-block-start: var(--hb-space-2);
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }
  `;

  @property({ attribute: false })
  accessor weeks: WeeklyCommits[] = [];

  override render() {
    const { weeks } = this;
    if (!weeks.length) return nothing;
    const total = weeks.reduce((sum, { commits }) => sum + commits, 0);
    const most = Math.max(1, ...weeks.map(({ commits }) => commits));
    const summary = `${total} ${total === 1 ? 'commit' : 'commits'} in the last ${weeks.length} weeks`;
    return html`
      <div class="chart" role="img" aria-label="${summary}">
        ${weeks.map(
          ({ week, commits }) =>
            html`<div
              class="week ${commits ? '' : 'none'}"
              style="block-size: ${commits ? Math.max(3, (commits / most) * 100) : 0}%"
              title="${commits} ${commits === 1 ? 'commit' : 'commits'}, week of ${week}"
            ></div>`,
        )}
      </div>
      <div class="axis" aria-hidden="true">
        <span>${label(weeks[0]!.week)}</span>
        <span>${summary.replace(` in the last ${weeks.length} weeks`, ' in the last year')}</span>
        <span>${label(weeks.at(-1)!.week)}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'commit-activity-chart': CommitActivityChart;
  }
}
