import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../components/hero/hero-block';
import { heroText } from '../components/hero/hero-block';
import { PAGE_TONES } from '../components/hero/simple-hero';
import { ThemedComponent } from '../components/themed-component';
import type { LegalDocument } from '../data/legal';
import { pageInner } from '../styles/page';
import { updateTextMetadata } from '../utils/metadata';

/** A page of plain text with headings, such as the privacy policy. */
@customElement('legal-page')
export class LegalPage extends ThemedComponent {
  static override styles = [
    heroText,
    pageInner,
    css`
      :host {
        display: block;
        background-color: var(--hb-section-background);
        color: var(--hb-color-on-surface);
      }

      h2 {
        margin: var(--hb-space-8) 0 var(--hb-space-3);
        font-size: var(--hb-text-xl);
      }

      p,
      li {
        max-inline-size: 46rem;
        line-height: 1.6;
      }

      .updated {
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-sm);
      }
    `,
  ];

  @property({ attribute: false })
  accessor document: LegalDocument | undefined;

  override connectedCallback() {
    super.connectedCallback();
    if (this.document) updateTextMetadata(this.document.title, this.document.description);
  }

  override render() {
    const page = this.document;
    if (!page) return html``;
    return html`
      <hero-block tone="${PAGE_TONES.team}">
        <h1 class="hero-title">${page.title}</h1>
        <p class="hero-description">${page.description}</p>
      </hero-block>

      <div class="inner">
        <p class="updated">Last updated ${page.updated}</p>
        ${page.sections.map(
          ({ heading, paragraphs = [], items = [] }) => html`
            <section>
              <h2>${heading}</h2>
              ${paragraphs.map((text) => html`<p>${text}</p>`)}
              ${
                items.length
                  ? html`<ul>
                      ${items.map((text) => html`<li>${text}</li>`)}
                    </ul>`
                  : ''
              }
            </section>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'legal-page': LegalPage;
  }
}
