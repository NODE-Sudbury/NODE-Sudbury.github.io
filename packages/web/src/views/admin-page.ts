import { Success } from '@abraham/remotedata';
import { msg } from '@lit/localize';
import { css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../components/admin/admin-members';
import '../components/admin/admin-organization-form';
import '../components/admin/admin-sponsors';
import '../components/shared/node-icon';
import '../components/ui/hb-button';
import '../components/ui/hb-chip';
import '../components/ui/hb-progress';
import { ThemedComponent } from '../components/themed-component';
import { fromStore } from '../controllers/from-store';
import { fetchOwnAdminRole } from '../db/admins';
import { fetchAdminMembers, fetchSubscriberCount } from '../db/admin-members';
import { type AdminRole, canOpenDashboard } from '../models/admin';
import type { AdminMember } from '../models/admin-member';
import { sessionRestored } from '../store/auth';
import { openSigninDialog } from '../store/dialogs';
import type { UserState } from '../store/user';
import { displayFont } from '../styles/shared';
import { updateTextMetadata } from '../utils/metadata';

/** The parts of the admin dashboard, in the order the side rail lists them. */
export const ADMIN_SECTIONS = [
  'home',
  'analytics',
  'events',
  'emails',
  'members',
  'settings',
  'sponsors',
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const adminPath = (section: AdminSection): string =>
  section === 'home' ? '/admin' : `/admin/${section}`;

const ICONS: Record<AdminSection, string> = {
  home: 'dashboard',
  analytics: 'analytics',
  events: 'calendar',
  emails: 'mail',
  members: 'people',
  settings: 'settings',
  sponsors: 'storefront',
};

const label = (section: AdminSection) =>
  ({
    home: msg('Home', { id: 'pages.admin.nav-home' }),
    analytics: msg('Analytics', { id: 'pages.admin.nav-analytics' }),
    events: msg('Events', { id: 'pages.admin.nav-events' }),
    emails: msg('Emails', { id: 'pages.admin.nav-emails' }),
    members: msg('Members', { id: 'pages.admin.nav-members' }),
    settings: msg('Settings', { id: 'pages.admin.nav-settings' }),
    sponsors: msg('Sponsors', { id: 'pages.admin.nav-sponsors' }),
  })[section];

const about = (section: AdminSection) =>
  ({
    home: '',
    analytics: msg('See how the community and the site are growing.', {
      id: 'pages.admin.about-analytics',
    }),
    events: msg('Create events and see who signed up.', { id: 'pages.admin.about-events' }),
    emails: msg('Write to subscribers and members.', { id: 'pages.admin.about-emails' }),
    members: msg('Everyone who has joined NODE.', { id: 'pages.admin.about-members' }),
    settings: msg('Settings for the site and the team.', { id: 'pages.admin.about-settings' }),
    sponsors: msg('Keep track of the sponsors and partners of NODE.', {
      id: 'pages.admin.about-sponsors',
    }),
  })[section];

const roleLabel = (role: AdminRole) =>
  ({
    super_admin: msg('Super admin', { id: 'pages.admin.role-super' }),
    admin: msg('Admin', { id: 'pages.admin.role-admin' }),
    check_in_volunteer: msg('Check-in volunteer', { id: 'pages.admin.role-volunteer' }),
  })[role];

/** The admin side of the site: a side rail of sections, and the section that is open. */
@customElement('admin-page')
export class AdminPage extends ThemedComponent {
  static override styles = css`
    :host {
      display: block;
      background-color: var(--hb-section-background);
      color: var(--hb-color-on-surface);
    }

    /* Content-box, so the page lines up with the rest of the site. */
    .inner {
      box-sizing: content-box;
      max-inline-size: var(--hb-content-max);
      margin-inline: auto;
      padding: var(--hb-space-6) var(--hb-gutter) var(--hb-space-9);
    }

    .layout {
      display: grid;
      grid-template-columns: 6rem minmax(0, 1fr);
      gap: var(--hb-space-7);
      align-items: start;
    }

    .rail {
      position: sticky;
      inset-block-start: calc(var(--hb-space-9) + var(--hb-space-4));
      display: flex;
      flex-direction: column;
      gap: var(--hb-space-1);
      padding: var(--hb-space-2);
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      background-color: var(--hb-panel-background);
    }

    .rail a {
      display: grid;
      justify-items: center;
      gap: var(--hb-space-1);
      padding: var(--hb-space-3) var(--hb-space-1);
      border-radius: var(--hb-radius-m);
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      text-decoration: none;
    }

    .rail a:hover {
      background-color: color-mix(in srgb, currentColor 8%, transparent);
    }

    .rail a[aria-current='page'] {
      background-color: color-mix(in srgb, var(--hb-color-primary) 16%, transparent);
      color: var(--hb-color-primary);
      font-weight: 600;
    }

    .rail node-icon {
      inline-size: 1.5rem;
      block-size: 1.5rem;
    }

    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--hb-space-2) var(--hb-space-5);
      margin-block-end: var(--hb-space-6);
      padding-block-end: var(--hb-space-4);
      border-block-end: var(--hb-border-width) solid var(--hb-border-color);
    }

    h1 {
      margin: 0;
      ${displayFont('display', '3xl', 1.1)};
    }

    .lede {
      margin: var(--hb-space-1) 0 0;
      color: var(--hb-color-on-surface-variant);
    }

    .head-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--hb-space-3);
    }

    h2 {
      margin: 0 0 var(--hb-space-3);
      ${displayFont('heading', 'lg', 1.2)};
    }

    .home {
      display: grid;
      gap: var(--hb-space-7);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: var(--hb-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .stat {
      display: grid;
      gap: var(--hb-space-1);
      padding: var(--hb-space-5);
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      background-color: var(--hb-panel-background);
      box-shadow: var(--hb-shadow-card);
    }

    .stat-number {
      ${displayFont('display', '3xl', 1)};
    }

    .stat-label {
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      font-weight: 600;
    }

    .shortcuts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      gap: var(--hb-space-3);
    }

    .shortcut {
      display: grid;
      justify-items: center;
      gap: var(--hb-space-2);
      padding: var(--hb-space-4);
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      background-color: var(--hb-panel-background);
      color: inherit;
      font-weight: 600;
      text-decoration: none;
    }

    .shortcut:hover {
      background-color: color-mix(in srgb, currentColor 8%, var(--hb-panel-background));
    }

    .shortcut node-icon {
      inline-size: 1.5rem;
      block-size: 1.5rem;
    }

    .soon {
      display: grid;
      justify-items: start;
      gap: var(--hb-space-3);
      padding: var(--hb-space-6);
      border: var(--hb-border-width) dashed var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      color: var(--hb-color-on-surface-variant);
    }

    .soon p {
      margin: 0;
    }

    .stack {
      display: grid;
      justify-items: start;
      gap: var(--hb-space-4);
    }

    .stack p {
      margin: 0;
    }

    @media (max-width: 48rem) {
      .layout {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--hb-space-5);
      }

      .rail {
        position: static;
        flex-direction: row;
        overflow-x: auto;
      }

      .rail a {
        flex: 1 0 auto;
        min-inline-size: 4.5rem;
      }
    }
  `;

  /** Which part of the dashboard is open. */
  @property()
  accessor section: AdminSection = 'home';

  /** `new` or `edit` while a page inside a section, such as adding a sponsor, is open. */
  @property()
  accessor action: '' | 'new' | 'edit' = '';

  @fromStore((state) => state.user)
  private accessor user!: UserState;

  // False on the server and in the first render, so hydration matches whoever is signed in.
  @state()
  private accessor ready = false;
  @state()
  private accessor loading = false;
  @state()
  private accessor adminRole: AdminRole | undefined;
  @state()
  private accessor members: AdminMember[] = [];
  @state()
  private accessor subscribers: number | undefined;
  @state()
  private accessor failed = false;

  private loadedFor: string | undefined;

  override async firstUpdated() {
    updateTextMetadata(
      msg('Admin dashboard', { id: 'pages.admin.title' }),
      msg('Where the people who run NODE manage the site.', { id: 'pages.admin.description' }),
    );
    await sessionRestored;
    this.ready = true;
  }

  override updated(_changed: PropertyValues) {
    if (!this.ready) return;
    const uid = this.user instanceof Success ? this.user.data.uid : undefined;
    if (uid === this.loadedFor) return;
    this.loadedFor = uid;
    this.adminRole = undefined;
    this.members = [];
    this.subscribers = undefined;
    if (uid) void this.load(uid);
  }

  private async load(uid: string) {
    this.loading = true;
    this.failed = false;
    try {
      const role = await fetchOwnAdminRole(uid);
      if (uid !== this.loadedFor) return;
      this.adminRole = role;
      if (canOpenDashboard(role)) {
        const [members, subscribers] = await Promise.all([
          fetchAdminMembers(),
          fetchSubscriberCount(),
        ]);
        if (uid !== this.loadedFor) return;
        this.members = members;
        this.subscribers = subscribers;
      }
    } catch {
      // No role is the safe answer: the page then says there is no access.
      this.failed = true;
    } finally {
      this.loading = false;
    }
  }

  override render() {
    return html`<div class="inner">${this.renderBody()}</div>`;
  }

  private renderBody() {
    if (!this.ready || this.loading) return html`<hb-progress></hb-progress>`;
    if (!(this.user instanceof Success)) {
      return html`<div class="stack">
        <h1>${msg('Admin dashboard', { id: 'pages.admin.title' })}</h1>
        <p>${msg('Sign in to open the admin dashboard.', { id: 'pages.admin.sign-in' })}</p>
        <hb-button @click="${() => openSigninDialog()}">
          ${msg('Sign in', { id: 'common.sign-in' })}
        </hb-button>
      </div>`;
    }
    if (!canOpenDashboard(this.adminRole)) {
      return html`<div class="stack">
        <h1>${msg('Admin dashboard', { id: 'pages.admin.title' })}</h1>
        <p>
          ${msg('You do not have access to the admin dashboard.', { id: 'pages.admin.denied' })}
        </p>
        <hb-button variant="outlined" href="/">
          ${msg('Back to the home page', { id: 'pages.admin.home' })}
        </hb-button>
      </div>`;
    }
    return html`<div class="layout">
      ${this.renderRail()}
      <main>${this.renderSection()}</main>
    </div>`;
  }

  private renderRail() {
    return html`<nav class="rail" aria-label="${msg('Admin sections', { id: 'pages.admin.nav' })}">
      ${ADMIN_SECTIONS.map(
        (section) =>
          html`<a
            href="${adminPath(section)}"
            aria-current="${section === this.section ? 'page' : nothing}"
          >
            <node-icon name="${ICONS[section]}"></node-icon>
            ${label(section)}
          </a>`,
      )}
    </nav>`;
  }

  private renderSection() {
    const { section } = this;
    return html`
      <header class="head">
        <div>
          <h1>${this.heading()}</h1>
          ${this.lede() ? html`<p class="lede">${this.lede()}</p>` : nothing}
        </div>
        <div class="head-actions">
          ${this.adminRole ? html`<hb-chip accent="3">${roleLabel(this.adminRole)}</hb-chip>` : nothing}
          <hb-button variant="outlined" href="/" target="_blank" trailing-icon>
            ${msg('View site', { id: 'pages.admin.view-site' })}
            <node-icon slot="icon" name="open-in-new"></node-icon>
          </hb-button>
        </div>
      </header>
      ${
        this.failed
          ? html`<p>
              ${msg('Some numbers could not be loaded. Please, try again later.', {
                id: 'pages.admin.load-failed',
              })}
            </p>`
          : nothing
      }
      ${
        section === 'home'
          ? this.renderHome()
          : section === 'members'
            ? html`<admin-members .members="${this.members}"></admin-members>`
            : section === 'sponsors'
              ? this.action
                ? html`<admin-organization-form></admin-organization-form>`
                : html`<admin-sponsors></admin-sponsors>`
              : this.renderSoon(section)
      }
    `;
  }

  private heading() {
    const { section, action } = this;
    if (section === 'sponsors' && action === 'new') {
      return msg('Add a sponsor or partner', { id: 'pages.admin.add-title' });
    }
    if (section === 'sponsors' && action === 'edit') {
      return msg('Edit a sponsor or partner', { id: 'pages.admin.edit-title' });
    }
    return section === 'home' ? msg('NODE', { id: 'pages.admin.home-title' }) : label(section);
  }

  private lede() {
    return this.action ? '' : about(this.section);
  }

  private renderHome() {
    const { members } = this;
    const stats: [string, string][] = [
      [String(members.length), msg('Members', { id: 'pages.admin.stat-members' })],
      [
        String(members.filter((member) => member.isPublic).length),
        msg('Public profiles', { id: 'pages.admin.stat-public' }),
      ],
      [
        String(members.filter((member) => member.isExclusiveMember).length),
        msg('Exclusive members', { id: 'pages.admin.stat-exclusive' }),
      ],
      [
        this.subscribers === undefined ? '-' : String(this.subscribers),
        msg('Subscribers', { id: 'pages.admin.stat-subscribers' }),
      ],
    ];
    return html`<div class="home">
      <section aria-labelledby="overview">
        <h2 id="overview">${msg('Overview', { id: 'pages.admin.overview' })}</h2>
        <ul class="stats">
          ${stats.map(
            ([number, name]) =>
              html`<li class="stat">
                <span class="stat-number">${number}</span>
                <span class="stat-label">${name}</span>
              </li>`,
          )}
        </ul>
      </section>
      <section aria-labelledby="shortcuts">
        <h2 id="shortcuts">${msg('Jump to', { id: 'pages.admin.jump' })}</h2>
        <div class="shortcuts">
          ${(['events', 'emails', 'members', 'settings'] as const).map(
            (section) =>
              html`<a class="shortcut" href="${adminPath(section)}">
                <node-icon name="${ICONS[section]}"></node-icon>
                ${label(section)}
              </a>`,
          )}
        </div>
      </section>
      <section aria-labelledby="upcoming">
        <h2 id="upcoming">${msg('Upcoming events', { id: 'pages.admin.upcoming' })}</h2>
        ${this.renderSoon('events')}
      </section>
    </div>`;
  }

  private renderSoon(section: AdminSection) {
    return html`<div class="soon">
      <hb-chip>${msg('Coming soon', { id: 'pages.admin.soon' })}</hb-chip>
      <p>
        ${msg('This part of the dashboard is on its way.', { id: 'pages.admin.soon-body' })}
        ${about(section)}
      </p>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-page': AdminPage;
  }
}
