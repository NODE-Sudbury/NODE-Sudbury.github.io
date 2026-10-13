import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { OpenSourceProject } from '../../models/open-source';
import { displayFont } from '../../styles/shared';
import { ThemedComponent } from '../themed-component';
import '../ui/hb-card';
import './node-icon';

/**
 * A project as one link: a mark, its name, language and license, a short description and its
 * numbers. In a container narrower than 480px, such as a one-column list, it is a compact row.
 */
@customElement('project-card')
export class ProjectCard extends ThemedComponent {
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
      align-items: center;
      gap: var(--hb-space-3);
      padding: var(--hb-space-5);
      text-align: center;
    }

    .mark {
      display: grid;
      place-items: center;
      flex: none;
      inline-size: 96px;
      block-size: 96px;
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: 50%;
      background-color: var(--hb-color-accent-1-container);
    }

    .mark node-icon {
      inline-size: 54%;
      block-size: 54%;
    }

    .text {
      display: grid;
      justify-items: center;
      gap: var(--hb-space-1);
      min-inline-size: 0;
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

    .description {
      display: -webkit-box;
      margin: var(--hb-space-1) 0 0;
      overflow: hidden;
      font-size: var(--hb-text-sm);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      line-clamp: 3;
    }

    @container (width < 480px) {
      .content {
        flex-direction: row;
        padding: var(--hb-space-3) var(--hb-space-4);
        text-align: start;
      }

      .mark {
        inline-size: 56px;
        block-size: 56px;
      }

      .text {
        justify-items: start;
      }
    }
  `;

  @property({ attribute: false })
  accessor project!: OpenSourceProject;

  /** The name's heading level: 2 right under the page title, 3 under a section heading. */
  @property({ type: Number, attribute: 'heading-level' })
  accessor headingLevel: 2 | 3 = 3;

  override render() {
    const { project } = this;
    const meta = [project.language, project.license].filter(Boolean).join(' · ');
    const contributors = project.contributors.length;
    const stats = [
      `${project.stars} ${project.stars === 1 ? 'star' : 'stars'}`,
      `${contributors} ${contributors === 1 ? 'contributor' : 'contributors'}`,
    ].join(' · ');
    return html`
      <hb-card href="/open-source/${project.id}" label="${project.name}">
        <div class="content">
          <div class="mark">
            <node-icon name="github"></node-icon>
          </div>
          <div class="text">
            ${
              this.headingLevel === 2
                ? html`<h2 class="name">${project.name}</h2>`
                : html`<h3 class="name">${project.name}</h3>`
            }
            ${meta ? html`<p class="meta">${meta}</p>` : nothing}
            ${project.description ? html`<p class="description">${project.description}</p>` : nothing}
            <p class="stats">${stats}</p>
          </div>
        </div>
      </hb-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'project-card': ProjectCard;
  }
}
