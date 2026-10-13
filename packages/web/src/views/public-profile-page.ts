import { msg } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../components/hero/hero-block';
import { heroText } from '../components/hero/hero-block';
import { PAGE_TONES } from '../components/hero/simple-hero';
import '../components/markdown/short-markdown';
import '../components/shared/node-icon';
import '../components/shared/social-links';
import '../components/shared/speaker-profile';
import '../components/ui/hb-progress';
import { fetchPublicProfile } from '../db/member-profiles';
import type { PublicProfile } from '../models/member-profile';
import { profile as profileStyles } from '../styles/profile';
import { profileHeadline, profileSocials } from '../utils/member-profile';
import { updateTextMetadata } from '../utils/metadata';
import { ThemedComponent } from '../components/themed-component';

type Load = 'loading' | 'found' | 'missing' | 'failed';

/** The handle in `/members/<handle>`. The site serves this one page for every handle. */
export const handleFromPath = (pathname: string): string => {
  const [, , handle = ''] = pathname.split('/');
  try {
    return decodeURIComponent(handle).toLowerCase();
  } catch {
    return '';
  }
};

/** A member's public page: their photo, name, headline, links and what they wrote about themselves. */
@customElement('public-profile-page')
export class PublicProfilePage extends ThemedComponent {
  static override styles = [
    heroText,
    profileStyles,
    css`
      :host {
        display: block;
        background-color: var(--hb-section-background);
        color: var(--hb-color-on-surface);
      }

      .missing {
        display: grid;
        justify-items: start;
        gap: var(--hb-space-3);
      }
    `,
  ];

  @state()
  private accessor load: Load = 'loading';
  @state()
  private accessor member: PublicProfile | undefined;

  override async firstUpdated() {
    const handle = handleFromPath(window.location.pathname);
    if (!handle) {
      this.load = 'missing';
      return;
    }
    try {
      this.member = await fetchPublicProfile(handle);
      this.load = this.member ? 'found' : 'missing';
    } catch {
      this.load = 'failed';
    }
    if (this.member) {
      updateTextMetadata(this.member.fullName, profileHeadline(this.member));
    }
  }

  override render() {
    const { member } = this;
    return html`
      <hero-block tone="${PAGE_TONES.team}">
        <a class="back" href="/team">
          <node-icon name="arrow-left"></node-icon>
          ${msg('NODE members', { id: 'pages.members.back' })}
        </a>
        ${
          member
            ? html`<speaker-profile
                .speaker="${{
                  id: member.handle,
                  name: member.fullName,
                  photoUrl: member.avatarUrl,
                  title: profileHeadline(member),
                  company: '',
                  country: '',
                  ...(member.pronouns ? { pronouns: member.pronouns } : {}),
                }}"
              ></speaker-profile>`
            : html`<h1 class="hero-title">
                ${
                  this.load === 'loading'
                    ? msg('Loading...', { id: 'common.loading' })
                    : msg('Profile not found', { id: 'pages.members.not-found' })
                }
              </h1>`
        }
      </hero-block>

      <hb-progress ?hidden="${this.load !== 'loading'}"></hb-progress>

      <div class="inner">
        ${member ? this.renderProfile(member) : nothing}
        ${
          this.load === 'missing' || this.load === 'failed'
            ? html`<div class="missing">
                <p>
                  ${
                    this.load === 'missing'
                      ? msg('This profile is private, or there is no member with this handle.', {
                          id: 'pages.members.missing',
                        })
                      : msg('An error has occurred. Please, try again later.', {
                          id: 'common.general-error',
                        })
                  }
                </p>
              </div>`
            : nothing
        }
      </div>
    `;
  }

  private renderProfile(member: PublicProfile) {
    const socials = profileSocials(member);
    return html`
      ${
        socials.length
          ? html`<social-links
              variant="tonal"
              label="${msg('Social links', { id: 'pages.member.socials' })}"
              owner="${member.fullName}"
              .socials="${socials}"
            ></social-links>`
          : nothing
      }
      ${member.bio ? html`<short-markdown class="bio" .content="${member.bio}"></short-markdown>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'public-profile-page': PublicProfilePage;
  }
}
