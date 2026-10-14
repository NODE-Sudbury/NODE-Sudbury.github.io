import { msg, str } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../components/hero/hero-block';
import { heroText } from '../components/hero/hero-block';
import { PAGE_TONES } from '../components/hero/simple-hero';
import '../components/markdown/short-markdown';
import '../components/shared/node-icon';
import '../components/shared/speaker-photo';
import '../components/ui/hb-chip';
import '../components/ui/hb-progress';
import { fetchPublicProfile, type ProfileKey } from '../db/member-profiles';
import type { PublicProfile } from '../models/member-profile';
import { profile as profileStyles } from '../styles/profile';
import { memberSince, profileHeadline, profileSocials } from '../utils/member-profile';
import { updateTextMetadata } from '../utils/metadata';
import { ThemedComponent } from '../components/themed-component';

type Load = 'loading' | 'found' | 'missing' | 'failed';

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const safeDecode = (value: string): string | undefined => {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
};

/**
 * Which profile an address asks for: `/members/<handle>`, or `/profile/<id>` as links from the
 * older site had it. The site serves this one page for both.
 */
export const profileKeyFromPath = (pathname: string): ProfileKey | undefined => {
  const [, kind = '', value = ''] = pathname.split('/');
  const text = safeDecode(value);
  if (text === undefined) return undefined;
  if (kind === 'profile') return ID_PATTERN.test(text) ? { id: text.toLowerCase() } : undefined;
  return text ? { handle: text.toLowerCase() } : undefined;
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

      .who {
        display: grid;
        justify-items: center;
        gap: var(--hb-space-3);
        text-align: center;
      }

      .who .hero-title {
        margin: 0;
        overflow-wrap: anywhere;
      }

      .tags {
        justify-content: center;
      }

      .headline,
      .pronouns {
        margin: 0;
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-lg);
      }

      .pronouns {
        font-size: var(--hb-text-sm);
      }

      .card {
        display: grid;
        justify-items: center;
        gap: var(--hb-space-5);
        max-inline-size: 32rem;
        margin-inline: auto;
      }

      .card .bio {
        margin: 0;
        text-align: center;
      }

      .links {
        display: grid;
        inline-size: 100%;
        gap: var(--hb-space-3);
      }

      .link {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--hb-space-3);
        min-block-size: var(--hb-target-min);
        padding: var(--hb-space-3) var(--hb-space-5);
        border: var(--hb-border-width) solid var(--hb-border-color);
        border-radius: var(--hb-radius-l);
        background-color: var(--hb-panel-background);
        color: inherit;
        font-weight: 600;
        text-decoration: none;
        box-shadow: var(--hb-shadow-card);
      }

      .link:hover {
        background-color: color-mix(in srgb, currentColor 8%, var(--hb-panel-background));
      }

      .link node-icon {
        inline-size: 1.5rem;
        block-size: 1.5rem;
      }

      .since {
        margin: 0;
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-sm);
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
    const key = profileKeyFromPath(window.location.pathname);
    if (!key) {
      this.load = 'missing';
      return;
    }
    try {
      this.member = await fetchPublicProfile(key);
      this.load = this.member ? 'found' : 'missing';
    } catch {
      this.load = 'failed';
    }
    if (this.member) {
      updateTextMetadata(this.member.fullName, profileHeadline(this.member));
      // Someone who opened an older /profile/<id> link lands on the nicer address.
      if ('id' in key && this.member.handle) {
        window.history.replaceState(null, '', `/members/${this.member.handle}`);
      }
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
            ? this.renderWho(member)
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

  /** The photo, name, type and headline, centered in the hero. */
  private renderWho(member: PublicProfile) {
    const headline = profileHeadline(member);
    return html`<div class="who">
      <speaker-photo size="l" src="${member.avatarUrl}"></speaker-photo>
      <h1 class="hero-title">${member.fullName}</h1>
      <ul class="tags">
        <li>
          <hb-chip>
            ${
              member.memberType === 'student'
                ? msg('Student', { id: 'pages.members.student' })
                : msg('Professional', { id: 'pages.members.professional' })
            }
          </hb-chip>
        </li>
        ${
          member.isExclusiveMember
            ? html`<li>
                <hb-chip accent="1">
                  ${msg('Exclusive member', { id: 'pages.account.exclusive' })}
                </hb-chip>
              </li>`
            : nothing
        }
      </ul>
      ${headline ? html`<p class="headline">${headline}</p>` : nothing}
      ${member.pronouns ? html`<p class="pronouns">${member.pronouns}</p>` : nothing}
    </div>`;
  }

  private renderProfile(member: PublicProfile) {
    const socials = profileSocials(member);
    return html`<div class="card">
      ${member.bio ? html`<short-markdown class="bio" .content="${member.bio}"></short-markdown>` : nothing}
      ${
        socials.length
          ? html`<nav
              class="links"
              aria-label="${msg('Social links', { id: 'pages.member.socials' })}"
            >
              ${socials.map(
                (social) =>
                  html`<a
                    class="link"
                    href="${social.link}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <node-icon name="${social.icon}"></node-icon>
                    ${social.name}
                  </a>`,
              )}
            </nav>`
          : nothing
      }
      ${
        member.createdAt
          ? html`<p class="since">
              ${msg(str`Member since ${memberSince(member.createdAt)}`, {
                id: 'pages.account.member-since',
              })}
            </p>`
          : nothing
      }
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'public-profile-page': PublicProfilePage;
  }
}
