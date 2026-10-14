import { Success } from '@abraham/remotedata';
import { msg } from '@lit/localize';
import { css, html, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../components/hero/hero-block';
import { heroText } from '../components/hero/hero-block';
import { PAGE_TONES } from '../components/hero/simple-hero';
import '../components/ui/hb-button';
import '../components/ui/hb-chip';
import '../components/ui/hb-progress';
import { ThemedComponent } from '../components/themed-component';
import { fromStore } from '../controllers/from-store';
import { fetchOwnAdminRole } from '../db/admins';
import { type AdminRole, canOpenDashboard } from '../models/admin';
import { sessionRestored } from '../store/auth';
import { openSigninDialog } from '../store/dialogs';
import type { UserState } from '../store/user';
import { profile as profileStyles } from '../styles/profile';
import { updateTextMetadata } from '../utils/metadata';

const roleLabel = (role: AdminRole) =>
  ({
    super_admin: msg('Super admin', { id: 'pages.admin.role-super' }),
    admin: msg('Admin', { id: 'pages.admin.role-admin' }),
    check_in_volunteer: msg('Check-in volunteer', { id: 'pages.admin.role-volunteer' }),
  })[role];

/** The admin side of the site. For now it says who can be here, and the tools come next. */
@customElement('admin-page')
export class AdminPage extends ThemedComponent {
  static override styles = [
    heroText,
    profileStyles,
    css`
      :host {
        display: block;
        background-color: var(--hb-section-background);
        color: var(--hb-color-on-surface);
      }

      .stack {
        display: grid;
        justify-items: start;
        gap: var(--hb-space-4);
      }

      .stack p {
        margin: 0;
      }
    `,
  ];

  @fromStore((state) => state.user)
  private accessor user!: UserState;

  // False on the server and in the first render, so hydration matches whoever is signed in.
  @state()
  private accessor ready = false;
  @state()
  private accessor loading = false;
  @state()
  private accessor adminRole: AdminRole | undefined;

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
    if (uid) void this.load(uid);
  }

  private async load(uid: string) {
    this.loading = true;
    try {
      const role = await fetchOwnAdminRole(uid);
      if (uid === this.loadedFor) this.adminRole = role;
    } catch {
      // No role is the safe answer: the page then says there is no access.
    } finally {
      this.loading = false;
    }
  }

  override render() {
    return html`
      <hero-block tone="${PAGE_TONES.team}">
        <h1 class="hero-title">${msg('Admin dashboard', { id: 'pages.admin.title' })}</h1>
        <p class="hero-description">
          ${msg('Where the people who run NODE manage the site.', {
            id: 'pages.admin.lede',
          })}
        </p>
      </hero-block>

      <div class="inner">${this.renderBody()}</div>
    `;
  }

  private renderBody() {
    if (!this.ready || this.loading) return html`<hb-progress></hb-progress>`;
    if (!(this.user instanceof Success)) {
      return html`<div class="stack">
        <p>${msg('Sign in to open the admin dashboard.', { id: 'pages.admin.sign-in' })}</p>
        <hb-button @click="${() => openSigninDialog()}">
          ${msg('Sign in', { id: 'common.sign-in' })}
        </hb-button>
      </div>`;
    }
    if (!canOpenDashboard(this.adminRole)) {
      return html`<div class="stack">
        <p>
          ${msg('You do not have access to the admin dashboard.', { id: 'pages.admin.denied' })}
        </p>
        <hb-button variant="outlined" href="/">
          ${msg('Back to the home page', { id: 'pages.admin.home' })}
        </hb-button>
      </div>`;
    }
    return html`<div class="stack">
      <hb-chip accent="3">${this.adminRole ? roleLabel(this.adminRole) : ''}</hb-chip>
      <p>
        ${msg('You are signed in with admin access. The admin tools will appear here.', {
          id: 'pages.admin.welcome',
        })}
      </p>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-page': AdminPage;
  }
}
