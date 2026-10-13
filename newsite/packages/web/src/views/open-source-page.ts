import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../components/hero/simple-hero';
import '../components/open-source/contributors-chart';
import '../components/shared/project-card';
import type { Contributor, OpenSourceProject } from '../models/open-source';
import { displayFont } from '../styles/shared';
import { PageMetadataController } from '../controllers/page-metadata-controller';
import { ThemedComponent } from '../components/themed-component';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });

/** The organization's public repositories as cards, the newest activity first. */
@customElement('open-source-page')
export class OpenSourcePage extends ThemedComponent {
  static override styles = [
    css`
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
        padding: var(--hb-space-5) var(--hb-gutter) var(--hb-space-9);
        container-type: inline-size;
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

      .section-title {
        margin: var(--hb-space-8) 0 var(--hb-space-4);
        padding: 0;
        ${displayFont('display', '2xl', 1.15)};
      }

      .section-title.first {
        margin-block-start: var(--hb-space-5);
      }

      .projects {
        display: grid;
        grid-template-columns: repeat(
          auto-fill,
          minmax(min(100%, 17rem * var(--hb-card-scale, 1)), 1fr)
        );
        gap: var(--hb-space-5);
        margin: var(--hb-space-5) 0 0;
        padding: 0;
        list-style: none;
      }

      .projects > li {
        display: grid;
      }

      @container (width < 480px) {
        .projects {
          grid-template-columns: minmax(0, 1fr);
          gap: var(--hb-space-3);
        }
      }

      .note {
        margin: var(--hb-space-3) 0 0;
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-sm);
      }

      a {
        color: inherit;
        text-underline-offset: 0.2em;
      }
    `,
  ];

  @property({ attribute: false })
  accessor projects: OpenSourceProject[] = [];

  @property()
  accessor org = '';

  @property({ attribute: 'synced-at' })
  accessor syncedAt = '';

  constructor() {
    super();
    new PageMetadataController(this, 'openSource');
  }

  override render() {
    return html`
      <simple-hero page="openSource"></simple-hero>

      <div class="inner">
        ${
          this.projects.length
            ? html`<h2 class="section-title first">KPIs</h2>
                <dl class="stats">
                  ${this.stat('Projects', this.projects.length)}
                  ${this.stat('Contributors', this.contributors.length)}
                  ${this.stat('Total commits', this.totalCommits)}
                  ${this.stat('Stars', this.stars)}
                  ${this.stat('Languages', this.languages)}
                  ${this.stat('Last activity', this.lastActivity)}
                </dl>
                <h2 class="section-title">Repos</h2>
                <ul class="projects">
                  ${this.projects.map(
                    (project) =>
                      html`<li><project-card .project="${project}" heading-level="3"></project-card></li>`,
                  )}
                </ul>
                ${
                  this.contributors.length
                    ? html`<h2 class="section-title">Top contributors</h2>
                        <contributors-chart .contributors="${this.contributors}"></contributors-chart>
                        <p class="note">
                          Commits across all projects, ranked on GitHub. Bots are left out.
                        </p>`
                    : nothing
                }
                <p class="note">
                  Details come from
                  <a href="https://github.com/${this.org}" target="_blank" rel="noopener noreferrer"
                    >github.com/${this.org}</a
                  >${this.syncedAt ? html`, last updated ${formatDate(this.syncedAt)}` : nothing}.
                </p>`
            : html`<p>Open source projects are coming soon.</p>`
        }
      </div>
    `;
  }

  private stat(label: string, value: string | number) {
    return html`<div class="stat"><dt>${label}</dt><dd>${value}</dd></div>`;
  }

  /** Each person once, with their commits added up across every project. */
  private get contributors(): Contributor[] {
    const people = new Map<string, Contributor>();
    for (const project of this.projects) {
      for (const person of project.contributors) {
        const known = people.get(person.login);
        if (known) {
          known.contributions += person.contributions;
          known.projects = (known.projects ?? 1) + 1;
        } else {
          people.set(person.login, { ...person, projects: 1 });
        }
      }
    }
    return [...people.values()].sort((a, b) => b.contributions - a.contributions);
  }

  private get totalCommits() {
    return this.contributors.reduce((sum, { contributions }) => sum + contributions, 0);
  }

  private get stars() {
    return this.projects.reduce((sum, { stars }) => sum + stars, 0);
  }

  private get languages() {
    return new Set(this.projects.flatMap(({ languages }) => languages.map(({ name }) => name))).size;
  }

  private get lastActivity() {
    const latest = this.projects.map(({ pushedAt }) => pushedAt).sort().at(-1);
    return latest ? formatDate(latest) : '';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'open-source-page': OpenSourcePage;
  }
}
