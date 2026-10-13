import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { nfpBlock } from '../../config/site';
import { band } from '../../styles/band';
import { ThemedComponent } from '../themed-component';

/** The organization's details as lines of text. The first line is the lead. */
@customElement('nfp-block')
export class NfpBlock extends ThemedComponent {
  static override styles = [
    band,
    css`
      .text p {
        max-inline-size: var(--hb-prose-max);
        margin: var(--hb-space-4) 0 0;
      }

      .text .lede {
        font-size: var(--hb-text-lg);
      }
    `,
  ];

  override render() {
    const { title, lines } = nfpBlock;
    return html`
      <div class="inner">
        <div class="band-header">
          <h2 class="band-title">${title}</h2>
        </div>
        <div class="text">
          ${lines.map((line, index) => html`<p class="${index === 0 ? 'lede' : ''}">${line}</p>`)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nfp-block': NfpBlock;
  }
}
