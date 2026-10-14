import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Contributor } from '../../models/open-source';
import { ThemedComponent } from '../themed-component';

/** Who has contributed the most commits, as a ranked bar chart with each person's GitHub avatar. */
@customElement('contributors-chart')
export class ContributorsChart extends ThemedComponent {
  static override styles = css`
    :host {
      display: block;
    }

    ol {
      display: grid;
      gap: var(--hb-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: grid;
      grid-template-columns: 40px minmax(7rem, 11rem) 1fr auto;
      align-items: center;
      gap: var(--hb-space-3);
    }

    .avatar {
      inline-size: 40px;
      block-size: 40px;
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: 50%;
      background-color: var(--hb-color-accent-1-container);
      object-fit: cover;
    }

    a {
      color: inherit;
      font-weight: 600;
      overflow-wrap: anywhere;
      text-underline-offset: 0.2em;
    }

    .track {
      block-size: 14px;
      border-radius: 7px;
      background-color: var(--hb-color-surface-container);
    }

    .bar {
      block-size: 100%;
      min-inline-size: 6px;
      border-radius: 7px;
      background-color: var(--hb-color-accent-1);
    }

    .count {
      min-inline-size: 3ch;
      text-align: end;
      font-variant-numeric: tabular-nums;
    }

    .count small {
      display: block;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }

    @container (width < 480px) {
      li {
        grid-template-columns: 40px 1fr auto;
      }

      .track {
        grid-column: 1 / -1;
      }
    }

    :host {
      container-type: inline-size;
    }
  `;

  @property({ attribute: false })
  accessor contributors: Contributor[] = [];

  override render() {
    const ranked = [...this.contributors]
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 10);
    const most = ranked[0]?.contributions ?? 1;
    if (!ranked.length) return nothing;
    return html`
      <ol aria-label="Contributors ranked by commits">
        ${ranked.map(
          (person) =>
            html`<li>
              ${
                person.avatar
                  ? html`<img
                      class="avatar"
                      src="${person.avatar}"
                      alt=""
                      width="40"
                      height="40"
                      loading="lazy"
                    />`
                  : html`<span class="avatar"></span>`
              }
              <a href="${person.url}" target="_blank" rel="noopener noreferrer">${person.login}</a>
              <div class="track" aria-hidden="true">
                <div
                  class="bar"
                  style="inline-size: ${Math.max(2, (person.contributions / most) * 100)}%"
                ></div>
              </div>
              <span class="count"
                >${person.contributions}
                ${person.contributions === 1 ? 'commit' : 'commits'}${
                  person.projects
                    ? html`<small
                        >across ${person.projects}
                        ${person.projects === 1 ? 'repo' : 'repos'}</small
                      >`
                    : nothing
                }</span
              >
            </li>`,
        )}
      </ol>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'contributors-chart': ContributorsChart;
  }
}
