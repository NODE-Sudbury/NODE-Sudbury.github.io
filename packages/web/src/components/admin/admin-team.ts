import { msg, str } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { addTeamMember, fetchTeam, removeTeamMember } from '../../db/admin-team';
import { type AdminRole, canManageRole, canOpenDashboard } from '../../models/admin';
import type { AdminMember } from '../../models/admin-member';
import type { TeamMember } from '../../models/team-member';
import { store } from '../../store';
import { queueSnackbar } from '../../store/snackbars';
import { memberSince } from '../../utils/member-profile';
import { ThemedComponent } from '../themed-component';
import '../shared/speaker-photo';
import '../ui/hb-button';
import '../ui/hb-chip';
import '../ui/hb-dialog';
import '../ui/hb-progress';
import '../ui/hb-text-field';
import type { HbTextField } from '../ui/hb-text-field';
import './admin-activity';
import './admin-boards';

/**
 * The three tabs: the board's cards, the dashboard admins who hold the `admin` role, and the
 * check-in volunteers. Only the last two are people with access, so only they are in the table.
 */
type Tab = 'boards' | 'admin' | 'check_in_volunteer' | 'activity';
type AccessTab = 'admin' | 'check_in_volunteer';

const TABS: readonly Tab[] = ['boards', 'admin', 'check_in_volunteer'];

/** The activity log can only be read by the super admin, so only they get its tab. */
const SUPER_ADMIN_TABS: readonly Tab[] = [...TABS, 'activity'];

/** How many members the add dialog lists at once. */
const PICKER_SIZE = 8;

const roleLabel = (role: AdminRole) =>
  ({
    super_admin: msg('Super admin', { id: 'pages.admin.role-super' }),
    admin: msg('Dashboard admin', { id: 'pages.admin.role-board' }),
    check_in_volunteer: msg('Volunteer', { id: 'pages.admin.role-volunteer-short' }),
  })[role];

const matches = (query: string, ...parts: string[]) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = parts.join(' ').toLowerCase();
  return words.every((word) => text.includes(word));
};

/**
 * The Settings section of the admin dashboard: who is on the team. The super admin adds and
 * removes board admins, and admins and the super admin add and remove volunteers.
 */
@customElement('admin-team')
export class AdminTeam extends ThemedComponent {
  static override styles = css`
    :host {
      display: grid;
      gap: var(--hb-space-5);
    }

    [role='tablist'] {
      display: flex;
      gap: var(--hb-space-2);
      border-block-end: var(--hb-border-width) solid var(--hb-border-color);
    }

    [role='tab'] {
      min-block-size: var(--hb-target-min);
      padding: var(--hb-space-2) var(--hb-space-5);
      border: 0;
      border-block-end: 3px solid transparent;
      background: none;
      color: var(--hb-color-on-surface-variant);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    [role='tab']:hover {
      background-color: color-mix(in srgb, currentColor 8%, transparent);
    }

    [role='tab'][aria-selected='true'] {
      border-block-end-color: var(--hb-color-primary);
      color: var(--hb-color-primary);
    }

    [role='tabpanel'] {
      display: grid;
      gap: var(--hb-space-4);
    }

    .count {
      margin-inline-start: var(--hb-space-2);
      color: var(--hb-color-on-surface-variant);
      font-weight: 400;
    }

    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--hb-space-3);
    }

    .summary,
    .note {
      margin: 0;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }

    .scroll {
      overflow-x: auto;
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      background-color: var(--hb-panel-background);
    }

    table {
      inline-size: 100%;
      min-inline-size: 40rem;
      border-collapse: collapse;
    }

    th,
    td {
      padding: var(--hb-space-3) var(--hb-space-4);
      border-block-end: var(--hb-border-width) solid var(--hb-border-color);
      text-align: start;
      vertical-align: middle;
    }

    tbody tr:last-child td {
      border-block-end: 0;
    }

    th {
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      font-weight: 600;
      white-space: nowrap;
    }

    .who {
      display: flex;
      align-items: center;
      gap: var(--hb-space-3);
    }

    .name {
      font-weight: 600;
    }

    .muted {
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      overflow-wrap: anywhere;
    }

    .row-actions {
      display: flex;
      justify-content: flex-end;
    }

    .empty {
      margin: 0;
      padding: var(--hb-space-6);
      border: var(--hb-border-width) dashed var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      color: var(--hb-color-on-surface-variant);
    }

    .picker {
      display: grid;
      gap: var(--hb-space-3);
      margin: var(--hb-space-3) 0 0;
      padding: 0;
      list-style: none;
    }

    .pick {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--hb-space-3);
    }

    .confirm p {
      margin: 0;
    }

    .visually-hidden {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `;

  /** The role of the person looking at the page, which decides what they can change. */
  @property()
  accessor viewerRole: AdminRole | undefined;

  /** Every member, to pick from when adding someone. */
  @property({ attribute: false })
  accessor members: AdminMember[] = [];

  @state()
  private accessor tab: Tab = 'boards';
  @state()
  private accessor team: TeamMember[] = [];
  @state()
  private accessor loading = true;
  @state()
  private accessor failed = false;
  @state()
  private accessor query = '';
  @state()
  private accessor adding = false;
  @state()
  private accessor pickQuery = '';
  @state()
  private accessor removing: TeamMember | undefined;
  @state()
  private accessor busy = false;

  override async firstUpdated() {
    await this.load();
  }

  private async load() {
    try {
      this.team = await fetchTeam();
      this.failed = false;
    } catch {
      this.failed = true;
    } finally {
      this.loading = false;
    }
  }

  private inTab(tab: AccessTab): TeamMember[] {
    // The super admin leads the board tab, though they cannot be removed.
    return this.team.filter(({ role }) =>
      tab === 'admin' ? role === 'admin' || role === 'super_admin' : role === tab,
    );
  }

  private get shown(): TeamMember[] {
    if (this.tab === 'boards' || this.tab === 'activity') return [];
    return this.inTab(this.tab).filter(({ fullName, email }) =>
      matches(this.query, fullName, email),
    );
  }

  private canManage(tab: AccessTab) {
    return canManageRole(this.viewerRole, tab);
  }

  private selectTab(tab: Tab) {
    this.tab = tab;
    this.query = '';
  }

  private tabLabel(tab: Tab) {
    if (tab === 'boards') return msg('Boards', { id: 'pages.admin.tab-boards' });
    if (tab === 'activity') return msg('Activity', { id: 'pages.admin.tab-activity' });
    return tab === 'admin'
      ? msg('Dashboard admins', { id: 'pages.admin.tab-board' })
      : msg('Volunteers', { id: 'pages.admin.tab-volunteers' });
  }

  override render() {
    return html`
      <div
        role="tablist"
        aria-label="${msg('Boards, dashboard admins and volunteers', { id: 'pages.admin.team-tabs' })}"
      >
        ${this.tabs.map(
          (tab) =>
            html`<button
              role="tab"
              type="button"
              id="team-tab-${tab}"
              aria-selected="${tab === this.tab}"
              aria-controls="team-panel-${tab}"
              tabindex="${tab === this.tab ? 0 : -1}"
              @click="${() => this.selectTab(tab)}"
              @keydown="${this.onKeydown}"
            >
              ${this.tabLabel(tab)}
              ${tab === 'boards' || tab === 'activity' ? nothing : html`<span class="count">${this.inTab(tab).length}</span>`}
            </button>`,
        )}
      </div>
      <div role="tabpanel" id="team-panel-${this.tab}" aria-labelledby="team-tab-${this.tab}">
        ${this.loading ? html`<hb-progress></hb-progress>` : this.renderPanel()}
      </div>
      ${this.renderAddDialog()} ${this.renderRemoveDialog()}
    `;
  }

  // Arrow keys move between the tabs, as a tab list does.
  private readonly onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.selectTab(this.nextTab(event.key === 'ArrowRight' ? 1 : -1));
    void this.updateComplete.then(() =>
      this.shadowRoot?.querySelector<HTMLElement>(`#team-tab-${this.tab}`)?.focus(),
    );
  };

  private get tabs(): readonly Tab[] {
    return this.viewerRole === 'super_admin' ? SUPER_ADMIN_TABS : TABS;
  }

  private nextTab(step: number): Tab {
    const { tabs } = this;
    const index = tabs.indexOf(this.tab);
    return tabs[(index + step + tabs.length) % tabs.length] ?? 'boards';
  }

  private renderPanel() {
    const { tab, shown } = this;
    if (tab === 'activity') return html`<admin-activity></admin-activity>`;
    if (tab === 'boards') {
      return html`<admin-boards
        .members="${this.members}"
        ?canManage="${canOpenDashboard(this.viewerRole)}"
      ></admin-boards>`;
    }
    const all = this.inTab(tab);
    const manage = this.canManage(tab);
    return html`
      <div class="bar">
        <p class="summary" role="status">
          ${
            this.failed
              ? msg('The team could not be loaded. Please, try again later.', {
                  id: 'pages.admin.team-failed',
                })
              : this.query
                ? msg(str`${shown.length} of ${all.length} ${this.tabLabel(tab)}`, {
                    id: 'pages.admin.team-filtered',
                  })
                : msg(str`${all.length} ${this.tabLabel(tab)}`, { id: 'pages.admin.team-total' })
          }
        </p>
        ${
          manage
            ? html`<hb-button @click="${this.openAdd}">
                ${
                  tab === 'admin'
                    ? msg('Add dashboard admin', { id: 'pages.admin.add-board' })
                    : msg('Add volunteer', { id: 'pages.admin.add-volunteer' })
                }
              </hb-button>`
            : nothing
        }
      </div>
      ${
        manage
          ? nothing
          : html`<p class="note">
              ${msg('Only the super admin can add or remove dashboard admins.', {
                id: 'pages.admin.board-note',
              })}
            </p>`
      }
      ${
        all.length
          ? html`<hb-text-field
                type="search"
                name="search"
                label="${msg('Search the team', { id: 'pages.admin.team-search' })}"
                .value="${this.query}"
                @input="${(event: Event) => (this.query = (event.target as HbTextField).value)}"
              ></hb-text-field>
              ${
                shown.length
                  ? this.renderTable(shown, manage)
                  : html`<p class="empty">
                      ${msg('Nobody matches your search.', { id: 'pages.admin.team-none-match' })}
                    </p>`
              }`
          : html`<p class="empty">
              ${
                tab === 'admin'
                  ? msg('There are no dashboard admins yet.', { id: 'pages.admin.board-none' })
                  : msg('There are no volunteers yet.', { id: 'pages.admin.volunteers-none' })
              }
            </p>`
      }
    `;
  }

  private renderTable(list: TeamMember[], manage: boolean) {
    return html`<div class="scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">${msg('Member', { id: 'pages.admin.col-member' })}</th>
            <th scope="col">${msg('Email', { id: 'pages.admin.col-email' })}</th>
            <th scope="col">${msg('Role', { id: 'pages.admin.col-role' })}</th>
            <th scope="col">${msg('Added', { id: 'pages.admin.col-added' })}</th>
            <th scope="col">
              <span class="visually-hidden"
                >${msg('Actions', { id: 'pages.admin.col-actions' })}</span
              >
            </th>
          </tr>
        </thead>
        <tbody>
          ${list.map((person) => this.renderRow(person, manage))}
        </tbody>
      </table>
    </div>`;
  }

  private renderRow(person: TeamMember, manage: boolean) {
    const name = person.fullName || person.email;
    return html`<tr>
      <td>
        <div class="who">
          <speaker-photo size="xs" src="${person.avatarUrl}"></speaker-photo>
          <span class="name">${name}</span>
        </div>
      </td>
      <td class="muted">${person.email}</td>
      <td>
        <hb-chip accent="${person.role === 'super_admin' ? '3' : '1'}">
          ${roleLabel(person.role)}
        </hb-chip>
      </td>
      <td class="muted">${person.addedAt ? memberSince(person.addedAt) : ''}</td>
      <td>
        <div class="row-actions">
          ${
            manage && person.role !== 'super_admin'
              ? html`<hb-button variant="text" @click="${() => (this.removing = person)}">
                  ${msg('Remove', { id: 'pages.admin.remove' })}
                  <span class="visually-hidden">${name}</span>
                </hb-button>`
              : nothing
          }
        </div>
      </td>
    </tr>`;
  }

  private readonly openAdd = () => {
    this.pickQuery = '';
    this.adding = true;
  };

  private readonly closeAdd = () => {
    if (!this.busy) this.adding = false;
  };

  /** Members who are not on the team yet and match what was typed, a few at a time. */
  private get candidates(): AdminMember[] {
    const onTeam = new Set(this.team.map(({ userId }) => userId));
    return this.members
      .filter(({ id }) => !onTeam.has(id))
      .filter(({ fullName, email }) => matches(this.pickQuery, fullName, email))
      .slice(0, PICKER_SIZE);
  }

  private renderAddDialog() {
    const { tab } = this;
    return html`<hb-dialog
      heading="${
        tab === 'admin'
          ? msg('Add a dashboard admin', { id: 'pages.admin.add-board-title' })
          : msg('Add a volunteer', { id: 'pages.admin.add-volunteer-title' })
      }"
      ?open="${this.adding}"
      @close="${this.closeAdd}"
    >
      <hb-text-field
        type="search"
        name="pick"
        label="${msg('Search members by name or email', { id: 'pages.admin.pick-search' })}"
        .value="${this.pickQuery}"
        @input="${(event: Event) => (this.pickQuery = (event.target as HbTextField).value)}"
      ></hb-text-field>
      ${
        this.adding && this.candidates.length
          ? html`<ul class="picker">
              ${this.candidates.map(
                (member) =>
                  html`<li class="pick">
                    <div class="who">
                      <speaker-photo size="xs" src="${member.avatarUrl}"></speaker-photo>
                      <div>
                        <div class="name">${member.fullName || member.email}</div>
                        <div class="muted">${member.email}</div>
                      </div>
                    </div>
                    <hb-button
                      variant="outlined"
                      ?disabled="${this.busy}"
                      @click="${() => this.add(member)}"
                    >
                      ${msg('Add', { id: 'pages.admin.add' })}
                      <span class="visually-hidden">${member.fullName || member.email}</span>
                    </hb-button>
                  </li>`,
              )}
            </ul>`
          : html`<p class="note">
              ${msg('No members to add. Someone has to sign in to the site once first.', {
                id: 'pages.admin.pick-none',
              })}
            </p>`
      }
      <div slot="actions">
        <hb-button variant="text" ?disabled="${this.busy}" @click="${this.closeAdd}">
          ${msg('Close', { id: 'pages.admin.close' })}
        </hb-button>
      </div>
    </hb-dialog>`;
  }

  private async add(member: AdminMember) {
    // Only the two access tabs add people with a role.
    if (this.busy || this.tab === 'boards' || this.tab === 'activity') return;
    this.busy = true;
    try {
      await addTeamMember(member.id, this.tab);
      await this.load();
      this.adding = false;
      store.dispatch(
        queueSnackbar(
          msg(str`${member.fullName || member.email} was added.`, { id: 'pages.admin.team-added' }),
        ),
      );
    } catch {
      store.dispatch(queueSnackbar(this.generalError()));
    } finally {
      this.busy = false;
    }
  }

  private renderRemoveDialog() {
    const { removing } = this;
    return html`<hb-dialog
      heading="${
        removing
          ? msg(str`Remove ${removing.fullName || removing.email}?`, {
              id: 'pages.admin.remove-title',
            })
          : ''
      }"
      ?open="${removing !== undefined}"
      @close="${this.cancelRemove}"
    >
      <div class="confirm">
        <p>
          ${msg('They lose their access straight away. They stay a member of NODE.', {
            id: 'pages.admin.remove-body',
          })}
        </p>
      </div>
      <div slot="actions">
        <hb-button variant="text" ?disabled="${this.busy}" @click="${this.cancelRemove}">
          ${msg('Cancel', { id: 'pages.account.cancel' })}
        </hb-button>
        <hb-button ?disabled="${this.busy}" @click="${this.confirmRemove}">
          ${
            this.busy
              ? msg('Removing...', { id: 'pages.admin.removing' })
              : msg('Remove', { id: 'pages.admin.remove' })
          }
        </hb-button>
      </div>
    </hb-dialog>`;
  }

  private readonly cancelRemove = () => {
    if (!this.busy) this.removing = undefined;
  };

  private readonly confirmRemove = async () => {
    const { removing } = this;
    if (!removing || this.busy) return;
    this.busy = true;
    try {
      await removeTeamMember(removing.userId);
      this.team = this.team.filter(({ userId }) => userId !== removing.userId);
      this.removing = undefined;
      store.dispatch(queueSnackbar(msg('Removed.', { id: 'pages.admin.removed' })));
    } catch {
      store.dispatch(queueSnackbar(this.generalError()));
    } finally {
      this.busy = false;
    }
  };

  private generalError() {
    return msg('An error has occurred. Please, try again later.', { id: 'common.general-error' });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-team': AdminTeam;
  }
}
