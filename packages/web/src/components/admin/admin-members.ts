import { msg, str } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AdminMember } from '../../models/admin-member';
import { memberSince, profileHeadline } from '../../utils/member-profile';
import { ThemedComponent } from '../themed-component';
import '../shared/speaker-photo';
import '../ui/hb-chip';
import '../ui/hb-text-field';
import type { HbTextField } from '../ui/hb-text-field';

/** What the search looks at: a member's name, email, handle and where they work or study. */
const searchText = (member: AdminMember): string =>
  [member.fullName, member.email, member.handle, profileHeadline(member)].join(' ').toLowerCase();

/** The members list for the admin dashboard, with a search box. Read only. */
@customElement('admin-members')
export class AdminMembers extends ThemedComponent {
  static override styles = css`
    :host {
      display: grid;
      gap: var(--hb-space-4);
    }

    .summary {
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
      min-inline-size: 44rem;
      border-collapse: collapse;
      text-align: start;
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
      min-inline-size: 0;
    }

    .who-text {
      display: grid;
      min-inline-size: 0;
    }

    .name {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--hb-space-2);
      font-weight: 600;
    }

    .muted {
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      overflow-wrap: anywhere;
    }

    a {
      color: inherit;
    }

    .empty {
      margin: 0;
      padding: var(--hb-space-6);
      text-align: center;
      color: var(--hb-color-on-surface-variant);
    }
  `;

  @property({ attribute: false })
  accessor members: AdminMember[] = [];

  @state()
  private accessor query = '';

  private get shown(): AdminMember[] {
    const words = this.query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return this.members;
    return this.members.filter((member) => {
      const text = searchText(member);
      return words.every((word) => text.includes(word));
    });
  }

  override render() {
    const { shown } = this;
    return html`
      <hb-text-field
        type="search"
        name="search"
        label="${msg('Search members', { id: 'pages.admin.members-search' })}"
        .value="${this.query}"
        @input="${(event: Event) => (this.query = (event.target as HbTextField).value)}"
      ></hb-text-field>
      <p class="summary" role="status">
        ${
          this.query
            ? msg(str`${shown.length} of ${this.members.length} members`, {
                id: 'pages.admin.members-filtered',
              })
            : msg(str`${this.members.length} members`, { id: 'pages.admin.members-total' })
        }
      </p>
      ${shown.length ? this.renderTable(shown) : html`<p class="empty">${this.emptyText()}</p>`}
    `;
  }

  private emptyText() {
    return this.query
      ? msg('No members match your search.', { id: 'pages.admin.members-none-match' })
      : msg('There are no members yet.', { id: 'pages.admin.members-none' });
  }

  private renderTable(members: AdminMember[]) {
    return html`<div class="scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">${msg('Member', { id: 'pages.admin.col-member' })}</th>
            <th scope="col">${msg('Email', { id: 'pages.admin.col-email' })}</th>
            <th scope="col">${msg('Type', { id: 'pages.admin.col-type' })}</th>
            <th scope="col">${msg('Public profile', { id: 'pages.admin.col-profile' })}</th>
            <th scope="col">${msg('Joined', { id: 'pages.admin.col-joined' })}</th>
          </tr>
        </thead>
        <tbody>
          ${members.map((member) => this.renderRow(member))}
        </tbody>
      </table>
    </div>`;
  }

  private renderRow(member: AdminMember) {
    const headline = profileHeadline(member);
    return html`<tr>
      <td>
        <div class="who">
          <speaker-photo size="xs" src="${member.avatarUrl}"></speaker-photo>
          <div class="who-text">
            <span class="name">
              ${member.fullName || msg('No name yet', { id: 'pages.admin.no-name' })}
              ${
                member.isExclusiveMember
                  ? html`<hb-chip accent="1">
                      ${msg('Exclusive member', { id: 'pages.account.exclusive' })}
                    </hb-chip>`
                  : nothing
              }
              ${
                member.isActive
                  ? nothing
                  : html`<hb-chip>${msg('Inactive', { id: 'pages.admin.inactive' })}</hb-chip>`
              }
            </span>
            ${headline ? html`<span class="muted">${headline}</span>` : nothing}
          </div>
        </div>
      </td>
      <td class="muted">${member.email}</td>
      <td>
        ${
          member.memberType === 'student'
            ? msg('Student', { id: 'pages.members.student' })
            : msg('Professional', { id: 'pages.members.professional' })
        }
      </td>
      <td>
        ${
          member.isPublic && member.handle
            ? html`<a href="/members/${member.handle}">/members/${member.handle}</a>`
            : member.isPublic
              ? msg('Public, no handle', { id: 'pages.admin.public-no-handle' })
              : msg('Private', { id: 'pages.admin.private' })
        }
      </td>
      <td class="muted">${member.createdAt ? memberSince(member.createdAt) : ''}</td>
    </tr>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-members': AdminMembers;
  }
}
