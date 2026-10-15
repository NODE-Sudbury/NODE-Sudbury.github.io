import { msg, str } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../components/hero/hero-block';
import { PAGE_TONES } from '../components/hero/simple-hero';
import '../components/markdown/short-markdown';
import '../components/shared/node-icon';
import '../components/shared/social-links';
import '../components/shared/speaker-profile';
import type { Member } from '../models/member';
import { memberSlug } from '../utils/members';
import { profile } from '../styles/profile';
import { ThemedComponent } from '../components/themed-component';

/** One member of the board: their photo, which moves here from their card, name, title, links and bio. */
@customElement('member-page')
export class MemberPage extends ThemedComponent {
  static override styles = [
    profile,
    css`
      :host {
        display: block;
        background-color: var(--hb-section-background);
        color: var(--hb-color-on-surface);
      }
    `,
  ];

  @property({ attribute: false })
  accessor member: Member | undefined;

  /** The bio the member wrote, or a line that says who they are. */
  private bio(member: Member): string {
    return (
      member.bio ??
      msg(str`${member.name} is ${member.title} of the N.O.D.E. board of directors.`, {
        id: 'pages.member.default-bio',
      })
    );
  }

  override render() {
    const { member } = this;
    if (!member) return nothing;
    return html`
      <hero-block tone="${PAGE_TONES.team}">
        <a class="back" href="/team">
          <node-icon name="arrow-left"></node-icon>
          ${msg('All board members', { id: 'pages.member.all-members' })}
        </a>
        <speaker-profile
          .speaker="${{
            id: memberSlug(member),
            name: member.name,
            photoUrl: member.photoUrl,
            title: member.title,
            company: 'N.O.D.E.',
            country: '',
          }}"
        ></speaker-profile>
      </hero-block>

      <div class="inner">
        ${
          member.socials?.length
            ? html`<social-links
                variant="tonal"
                label="${msg('Social links', { id: 'pages.member.socials' })}"
                .socials="${member.socials}"
              ></social-links>`
            : nothing
        }
        <short-markdown class="bio" .content="${this.bio(member)}"></short-markdown>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'member-page': MemberPage;
  }
}
