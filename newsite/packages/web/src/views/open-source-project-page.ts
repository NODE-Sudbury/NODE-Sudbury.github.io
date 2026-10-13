import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../components/hero/hero-block';
import { heroText } from '../components/hero/hero-block';
import { PAGE_TONES } from '../components/hero/simple-hero';
import '../components/markdown/short-markdown';
import '../components/open-source/commit-activity-chart';
import '../components/open-source/contributors-chart';
import '../components/shared/node-icon';
import '../components/ui/hb-button';
import '../components/ui/hb-chip';
import type { OpenSourceProject } from '../models/open-source';
import { profile } from '../styles/profile';
import { ThemedComponent } from '../components/themed-component';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });

const LANGUAGE_COLORS = [
  'var(--hb-color-accent-1)',
  'var(--hb-color-accent-2)',
  'var(--hb-color-accent-3)',
  'var(--hb-color-accent-4)',
  'var(--hb-color-on-surface-variant)',
  'var(--hb-color-surface-container)',
];

/** One project: what it is, its numbers, who contributes the most and how active it has been. */
@customElement('open-source-project-page')
export class OpenSourceProjectPage extends ThemedComponent {
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

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--hb-space-3);
        margin-block-start: var(--hb-space-5);
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
        gap: var(--hb-space-3);
        margin: 0;
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
        font-size: var(--hb-text-xl);
        font-weight: 700;
      }

      .languages {
        display: flex;
        overflow: hidden;
        block-size: 14px;
        border-radius: 7px;
        background-color: var(--hb-color-surface-container);
      }

      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--hb-space-2) var(--hb-space-5);
        margin-block-start: var(--hb-space-3);
      }

      .legend li {
        display: flex;
        align-items: center;
        gap: var(--hb-space-2);
        font-size: var(--hb-text-sm);
      }

      .dot {
        inline-size: 12px;
        block-size: 12px;
        border-radius: 50%;
      }

      .note {
        margin: var(--hb-space-3) 0 0;
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-sm);
      }

      a {
        text-underline-offset: 0.2em;
      }
    `,
  ];

  @property({ attribute: false })
  accessor project!: OpenSourceProject;

  override render() {
    const project = this.project;
    const facts = [project.language, project.license].filter(Boolean) as string[];
    return html`
      <hero-block tone="${PAGE_TONES.openSource}">
        <a class="back" href="/open-source">
          <node-icon name="arrow-left"></node-icon>
          All projects
        </a>
        <h1 class="hero-title">${project.name}</h1>
        ${project.description ? html`<p class="hero-description">${project.description}</p>` : nothing}
        <ul class="facts">
          ${[...facts, ...project.topics].map((fact) => html`<li><hb-chip>${fact}</hb-chip></li>`)}
        </ul>
        <div class="actions">
          <hb-button href="${project.url}" target="_blank" variant="filled" size="l">
            <node-icon slot="icon" name="github"></node-icon>
            View the repository
          </hb-button>
          ${
            project.homepage
              ? html`<hb-button
                  href="${project.homepage}"
                  target="_blank"
                  variant="outlined"
                  size="l"
                >
                  <node-icon slot="icon" name="website"></node-icon>
                  Live site
                </hb-button>`
              : nothing
          }
        </div>
      </hero-block>

      <div class="inner">
        <dl class="stats">
          ${this.stat('Stars', project.stars)} ${this.stat('Forks', project.forks)}
          ${this.stat('Open issues', project.openIssues)}
          ${this.stat('Contributors', project.contributors.length)}
          ${this.stat('Last update', formatDate(project.pushedAt))}
          ${this.stat('Created', formatDate(project.createdAt))}
        </dl>

        ${
          project.contributors.length
            ? html`<h2 class="section-title">Top contributors</h2>
                <contributors-chart .contributors="${project.contributors}"></contributors-chart>
                <p class="note">Ranked by commits on GitHub. Bots are left out.</p>`
            : nothing
        }
        ${
          project.commitActivity.length
            ? html`<h2 class="section-title">Commit activity</h2>
                <commit-activity-chart .weeks="${project.commitActivity}"></commit-activity-chart>`
            : nothing
        }
        ${project.languages.length ? this.renderLanguages(project) : nothing}
        ${
          project.readme
            ? html`<h2 class="section-title">About this project</h2>
                <short-markdown class="bio" .content="${project.readme}"></short-markdown>`
            : nothing
        }
      </div>
    `;
  }

  private stat(label: string, value: string | number) {
    return html`<div class="stat">
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>`;
  }

  private renderLanguages(project: OpenSourceProject) {
    return html`
      <h2 class="section-title">Languages</h2>
      <div
        class="languages"
        role="img"
        aria-label="${project.languages.map(({ name, percent }) => `${name} ${percent}%`).join(', ')}"
      >
        ${project.languages.map(
          ({ percent }, index) =>
            html`<span
              style="inline-size: ${percent}%; background-color: ${LANGUAGE_COLORS[index % LANGUAGE_COLORS.length]}"
            ></span>`,
        )}
      </div>
      <ul class="legend">
        ${project.languages.map(
          ({ name, percent }, index) =>
            html`<li>
              <span
                class="dot"
                style="background-color: ${LANGUAGE_COLORS[index % LANGUAGE_COLORS.length]}"
              ></span>
              ${name} ${percent}%
            </li>`,
        )}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'open-source-project-page': OpenSourceProjectPage;
  }
}
