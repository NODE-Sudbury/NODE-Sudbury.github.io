import { Success } from '@abraham/remotedata';
import { msg, str } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fromStore } from '../../controllers/from-store';
import { fetchOwnAdminRole } from '../../db/admins';
import { type AdminRole, canOpenDashboard } from '../../models/admin';
import { signOut } from '../../store/auth';
import { openSigninDialog } from '../../store/dialogs';
import type { UserState } from '../../store/user';
import '../shared/node-icon';
import '../ui/hb-icon-button';
import '../ui/hb-menu';
import { ThemedComponent } from '../themed-component';
import { navigationLabel } from './navigation-label';

/** Sign in, or the signed-in visitor's menu. The header shows it when a feature needs sign-in. */
@customElement('account-menu')
export class AccountMenu extends ThemedComponent {
  static override styles = css`
    :host {
      display: inline-flex;
    }

    .avatar {
      inline-size: 32px;
      block-size: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .profile {
      display: grid;
      padding: var(--hb-space-2) var(--hb-space-4) var(--hb-space-3);
      border-block-end: 1px solid var(--hb-color-outline-variant);
      margin-block-end: var(--hb-space-2);
    }

    .name {
      font-weight: 600;
    }

    /* Gold, so the way into the admin side stands out from the member's own links. */
    .admin {
      color: var(--hb-color-accent-3);
      font-weight: 600;
    }

    .email {
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }
  `;

  @fromStore((state) => state.user)
  private accessor user!: UserState;

  // The signed-in member's admin role, once it is known. Most members have none.
  @state()
  private accessor adminRole: AdminRole | undefined;

  private adminRoleFor: string | undefined;

  override updated() {
    const uid = this.user instanceof Success ? this.user.data.uid : undefined;
    if (uid === this.adminRoleFor) return;
    this.adminRoleFor = uid;
    this.adminRole = undefined;
    if (uid) void this.loadAdminRole(uid);
  }

  private async loadAdminRole(uid: string) {
    try {
      const role = await fetchOwnAdminRole(uid);
      if (uid === this.adminRoleFor) this.adminRole = role;
    } catch {
      // Without the role the menu is the member's own, which is the safe answer.
    }
  }

  override render() {
    if (!(this.user instanceof Success)) {
      return html`
        <hb-icon-button label="${msg('Sign in', { id: 'common.sign-in' })}" @click="${this.signIn}">
          <node-icon name="account"></node-icon>
        </hb-icon-button>
      `;
    }

    const { displayName, email, photoURL } = this.user.data;
    const name = displayName || email || '';
    return html`
      <hb-menu>
        <hb-icon-button
          slot="trigger"
          label="${msg(str`Account of ${name}`, { id: 'shell.account-menu.label' })}"
        >
          ${
            photoURL
              ? html`<img
                  class="avatar"
                  src="${photoURL}"
                  alt=""
                  aria-hidden="true"
                  referrerpolicy="no-referrer"
                />`
              : html`<node-icon name="account"></node-icon>`
          }
        </hb-icon-button>
        <div class="profile" role="presentation">
          <span class="name">${displayName}</span>
          <span class="email">${email}</span>
        </div>
        ${
          __HB_FEATURES__.mySchedule
            ? html`<a role="menuitem" href="/events/my-schedule"
                >${navigationLabel('mySchedule')}</a
              >`
            : nothing
        }
        <a role="menuitem" href="/account"
          >${msg('My profile', { id: 'shell.account-menu.profile' })}</a
        >
        ${
          canOpenDashboard(this.adminRole)
            ? html`<a class="admin" role="menuitem" href="/admin"
                >${msg('Admin Dashboard', { id: 'shell.account-menu.admin' })}</a
              >`
            : nothing
        }
        <button role="menuitem" type="button" @click="${this.signOut}">
          ${msg('Sign out', { id: 'shell.header.sign-out' })}
        </button>
      </hb-menu>
    `;
  }

  private readonly signIn = () => {
    openSigninDialog();
  };

  private readonly signOut = () => {
    void signOut();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'account-menu': AccountMenu;
  }
}
