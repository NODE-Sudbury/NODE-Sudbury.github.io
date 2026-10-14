import { msg, str } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { safeUrl } from '../../utils/safe-url';
import { share } from '../../utils/share';
import { mailto, organizer, socialNetwork } from '../../config/site';
import { ThemedComponent } from '../themed-component';
import '../shared/node-icon';
import '../ui/hb-icon-button';

/** How each icon name reads to a screen reader. */
export const FOLLOW_LABELS: Record<string, string> = {
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  youtube: 'YouTube',
};

@customElement('footer-social')
export class FooterSocial extends ThemedComponent {
  static override styles = css`
    :host {
      display: grid;
      gap: var(--hb-space-3);
    }

    .title {
      margin: 0;
      font-weight: 600;
    }

    .social-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--hb-space-1) var(--hb-space-3);
    }

    ul {
      display: flex;
      flex-wrap: wrap;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    a {
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
  `;

  private socialNetwork = socialNetwork;
  private mailto = mailto;
  private organizer = organizer;
  private blogNewTab = organizer.blog?.startsWith('http') ?? false;

  override render() {
    const emailUs = msg('Email us', { id: 'footer.social.email-us' });
    const blog = safeUrl(this.organizer.blog);
    const target = this.blogNewTab ? '_blank' : nothing;
    const rel = this.blogNewTab ? 'noopener noreferrer' : nothing;
    return html`
      ${
        this.socialNetwork.follow.length
          ? html`<div class="social-group social-networks">
              <p class="title">${msg('Follow us', { id: 'footer.social.follow-us' })}</p>
              <ul>
                ${this.socialNetwork.follow.map(
                  (socFollow) => html`
                    <li>
                      <hb-icon-button
                        label="${FOLLOW_LABELS[socFollow.name] ?? socFollow.name}"
                        href="${socFollow.url}"
                        target="_blank"
                      >
                        <node-icon name="${socFollow.name}"></node-icon>
                      </hb-icon-button>
                    </li>
                  `,
                )}
              </ul>
            </div>`
          : nothing
      }

      <div class="social-group share">
        <p class="title">${msg('Share', { id: 'footer.social.share-title' })}</p>
        <ul>
          <li>
            <hb-icon-button
              label="${this.shareLabel('Facebook')}"
              share="facebook"
              @click="${this.share}"
            >
              <node-icon name="facebook"></node-icon>
            </hb-icon-button>
          </li>
          <li>
            <hb-icon-button label="${this.shareLabel('X')}" share="x" @click="${this.share}">
              <node-icon name="x"></node-icon>
            </hb-icon-button>
          </li>
        </ul>
      </div>

      <div class="social-group email">
        <a aria-label="${emailUs}" href="mailto:${this.mailto}">${emailUs}</a>
      </div>

      ${
        blog
          ? html`<div class="social-group blog">
              ${msg(html`Follow our <a href="${blog}" target="${target}" rel="${rel}">Blog</a>`, {
                id: 'footer.social.follow-blog',
              })}
            </div>`
          : nothing
      }
    `;
  }

  private shareLabel(network: string) {
    return msg(str`Share on ${network}`, { id: 'footer.social.share' });
  }

  private readonly share = (e: PointerEvent) => {
    share(e);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'footer-social': FooterSocial;
  }
}
