import { msg, str } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  CardLinkTakenError,
  deleteBoardMember,
  fetchBoardMembers,
  saveBoardMember,
} from '../../db/admin-board';
import type { AdminMember } from '../../models/admin-member';
import type { BoardMember } from '../../models/board-member';
import { store } from '../../store';
import { queueSnackbar } from '../../store/snackbars';
import { normalizeProfileUrl } from '../../utils/member-profile';
import { LOGO_ACCEPT, logoProblem } from '../../utils/organization';
import { ThemedComponent } from '../themed-component';
import '../shared/speaker-photo';
import '../ui/hb-button';
import '../ui/hb-dialog';
import '../ui/hb-progress';
import '../ui/hb-text-field';
import type { HbTextField } from '../ui/hb-text-field';

type Field = 'name' | 'title' | 'linkedinUrl' | 'githubUrl' | 'twitterUrl' | 'websiteUrl';
type Form = Record<Field, string> & { userId: string };
type Errors = Partial<Record<Field, string>>;

const EMPTY_FORM: Form = {
  name: '',
  title: '',
  linkedinUrl: '',
  githubUrl: '',
  twitterUrl: '',
  websiteUrl: '',
  userId: '',
};

/** Which sites a link box takes, so the LinkedIn box only takes LinkedIn. */
const LINK_HOSTS: Partial<Record<Field, readonly string[]>> = {
  linkedinUrl: ['linkedin.com'],
  githubUrl: ['github.com'],
  twitterUrl: ['x.com', 'twitter.com'],
};

const LINK_FIELDS = ['linkedinUrl', 'githubUrl', 'twitterUrl', 'websiteUrl'] as const;

const matches = (query: string, ...parts: string[]) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = parts.join(' ').toLowerCase();
  return words.every((word) => text.includes(word));
};

/**
 * The Boards tab of Settings: the board members' cards, with a title and an optional link to the
 * member account each card belongs to. The home page still shows its own board data for now.
 */
@customElement('admin-boards')
export class AdminBoards extends ThemedComponent {
  static override styles = css`
    :host {
      display: grid;
      gap: var(--hb-space-4);
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
      min-inline-size: 44rem;
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
      gap: var(--hb-space-2);
    }

    .empty {
      margin: 0;
      padding: var(--hb-space-6);
      border: var(--hb-border-width) dashed var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      color: var(--hb-color-on-surface-variant);
    }

    .form {
      display: grid;
      gap: var(--hb-space-4);
    }

    .row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      gap: var(--hb-space-4);
    }

    .label {
      margin: 0 0 var(--hb-space-2);
      font-weight: 600;
    }

    select {
      inline-size: 100%;
      min-block-size: var(--hb-target-min);
      padding: var(--hb-space-1) var(--hb-space-3);
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-control);
      background-color: var(--hb-color-surface-container);
      color: inherit;
      font: inherit;
    }

    .photo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--hb-space-4);
    }

    .photo-preview {
      display: grid;
      inline-size: 6rem;
      block-size: 6rem;
      overflow: hidden;
      border: var(--hb-border-width) dashed var(--hb-border-color);
      border-radius: 50%;
      background-color: var(--hb-color-surface-container);
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      place-items: center;
      text-align: center;
    }

    .photo-preview img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }

    .error {
      margin: 0;
      color: var(--hb-color-error);
      font-size: var(--hb-text-sm);
    }

    input[type='file'] {
      display: none;
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

  /** Every member, to link a card to one. */
  @property({ attribute: false })
  accessor members: AdminMember[] = [];

  /** Whether the person looking may add, change and delete cards. */
  @property({ type: Boolean })
  accessor canManage = false;

  @state()
  private accessor cards: BoardMember[] = [];
  @state()
  private accessor loading = true;
  @state()
  private accessor failed = false;
  @state()
  private accessor query = '';
  // The form dialog: open for a new card, or for the one being changed.
  @state()
  private accessor formOpen = false;
  @state()
  private accessor editing: BoardMember | undefined;
  @state()
  private accessor form: Form = EMPTY_FORM;
  @state()
  private accessor errors: Errors = {};
  @state()
  private accessor linkError = '';
  @state()
  private accessor photo: File | undefined;
  @state()
  private accessor photoPreview = '';
  @state()
  private accessor photoError = '';
  @state()
  private accessor saving = false;
  @state()
  private accessor deleting: BoardMember | undefined;
  @state()
  private accessor busy = false;

  override async firstUpdated() {
    await this.load();
  }

  override disconnectedCallback() {
    if (this.photo) URL.revokeObjectURL(this.photoPreview);
    super.disconnectedCallback();
  }

  private async load() {
    try {
      this.cards = await fetchBoardMembers();
      this.failed = false;
    } catch {
      this.failed = true;
    } finally {
      this.loading = false;
    }
  }

  private accountOf(card: BoardMember): AdminMember | undefined {
    return card.userId ? this.members.find(({ id }) => id === card.userId) : undefined;
  }

  private get shown(): BoardMember[] {
    return this.cards.filter((card) => {
      const account = this.accountOf(card);
      return matches(
        this.query,
        card.name,
        card.title,
        account?.fullName ?? '',
        account?.email ?? '',
      );
    });
  }

  /** Members a card can be linked to: not linked to another card, but the current one counts. */
  private get linkable(): AdminMember[] {
    const taken = new Set(
      this.cards.filter(({ id }) => id !== this.editing?.id).map(({ userId }) => userId),
    );
    return this.members
      .filter(({ id }) => !taken.has(id))
      .sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email));
  }

  override render() {
    if (this.loading) return html`<hb-progress></hb-progress>`;
    const { shown, cards } = this;
    return html`
      <div class="bar">
        <p class="summary" role="status">
          ${
            this.failed
              ? msg('The board could not be loaded. Please, try again later.', {
                  id: 'pages.admin.boards-failed',
                })
              : this.query
                ? msg(str`${shown.length} of ${cards.length} board members`, {
                    id: 'pages.admin.boards-filtered',
                  })
                : msg(str`${cards.length} board members`, { id: 'pages.admin.boards-total' })
          }
        </p>
        ${
          this.canManage
            ? html`<hb-button @click="${this.openAdd}">
                ${msg('Add board member', { id: 'pages.admin.add-board-member' })}
              </hb-button>`
            : nothing
        }
      </div>
      <p class="note">
        ${msg(
          'These cards are not on the home page yet. The home page keeps its own board for now.',
          {
            id: 'pages.admin.boards-note',
          },
        )}
      </p>
      ${
        cards.length
          ? html`<hb-text-field
                type="search"
                name="search"
                label="${msg('Search the board', { id: 'pages.admin.boards-search' })}"
                .value="${this.query}"
                @input="${(event: Event) => (this.query = (event.target as HbTextField).value)}"
              ></hb-text-field>
              ${
                shown.length
                  ? this.renderTable(shown)
                  : html`<p class="empty">
                      ${msg('Nobody matches your search.', { id: 'pages.admin.team-none-match' })}
                    </p>`
              }`
          : html`<p class="empty">
              ${msg('There are no board members yet.', { id: 'pages.admin.boards-none' })}
            </p>`
      }
      ${this.renderFormDialog()} ${this.renderDeleteDialog()}
    `;
  }

  private renderTable(list: BoardMember[]) {
    return html`<div class="scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">${msg('Member', { id: 'pages.admin.col-member' })}</th>
            <th scope="col">${msg('Title', { id: 'pages.admin.col-title' })}</th>
            <th scope="col">${msg('Account', { id: 'pages.admin.col-account' })}</th>
            <th scope="col">
              <span class="visually-hidden"
                >${msg('Actions', { id: 'pages.admin.col-actions' })}</span
              >
            </th>
          </tr>
        </thead>
        <tbody>
          ${list.map((card) => this.renderRow(card))}
        </tbody>
      </table>
    </div>`;
  }

  private renderRow(card: BoardMember) {
    const account = this.accountOf(card);
    return html`<tr>
      <td>
        <div class="who">
          <speaker-photo size="xs" src="${card.photoUrl}"></speaker-photo>
          <span class="name">${card.name}</span>
        </div>
      </td>
      <td>${card.title}</td>
      <td class="muted">
        ${
          account
            ? account.email
            : card.userId
              ? msg('Linked', { id: 'pages.admin.linked' })
              : msg('Not linked', { id: 'pages.admin.not-linked' })
        }
      </td>
      <td>
        <div class="row-actions">
          ${
            this.canManage
              ? html`<hb-button variant="outlined" @click="${() => this.openEdit(card)}">
                    ${msg('Edit', { id: 'pages.account.edit' })}
                    <span class="visually-hidden">${card.name}</span>
                  </hb-button>
                  <hb-button variant="text" @click="${() => (this.deleting = card)}">
                    ${msg('Delete', { id: 'pages.admin.delete' })}
                    <span class="visually-hidden">${card.name}</span>
                  </hb-button>`
              : nothing
          }
        </div>
      </td>
    </tr>`;
  }

  private readonly openAdd = () => {
    this.editing = undefined;
    this.resetForm(EMPTY_FORM, '');
    this.formOpen = true;
  };

  private openEdit(card: BoardMember) {
    this.editing = card;
    this.resetForm(
      {
        name: card.name,
        title: card.title,
        linkedinUrl: card.linkedinUrl,
        githubUrl: card.githubUrl,
        twitterUrl: card.twitterUrl,
        websiteUrl: card.websiteUrl,
        userId: card.userId ?? '',
      },
      card.photoUrl,
    );
    this.formOpen = true;
  }

  private resetForm(form: Form, photoPreview: string) {
    if (this.photo) URL.revokeObjectURL(this.photoPreview);
    this.form = form;
    this.errors = {};
    this.linkError = '';
    this.photo = undefined;
    this.photoPreview = photoPreview;
    this.photoError = '';
  }

  private readonly closeForm = () => {
    if (!this.saving) this.formOpen = false;
  };

  private text(field: Field, label: string, autocomplete = 'off') {
    return html`<hb-text-field
      label="${label}"
      name="${field}"
      autocomplete="${autocomplete}"
      .value="${this.form[field]}"
      error="${this.errors[field] ?? ''}"
      ?disabled="${this.saving}"
      @input="${(event: Event) => this.setField(field, (event.target as HbTextField).value)}"
    ></hb-text-field>`;
  }

  private setField(field: Field, value: string) {
    this.form = { ...this.form, [field]: value };
    if (this.errors[field]) this.errors = { ...this.errors, [field]: undefined };
  }

  private renderFormDialog() {
    return html`<hb-dialog
      heading="${
        this.editing
          ? msg('Edit a board member', { id: 'pages.admin.edit-board-title' })
          : msg('Add a board member', { id: 'pages.admin.add-board-member-title' })
      }"
      ?open="${this.formOpen}"
      @close="${this.closeForm}"
    >
      <div class="form">
        <div class="row">
          ${this.text('name', msg('Name', { id: 'pages.account.name' }), 'off')}
          ${this.text('title', msg('Title', { id: 'pages.admin.col-title' }))}
        </div>

        <label>
          <span class="label">${msg('Account', { id: 'pages.admin.col-account' })}</span>
          <select ?disabled="${this.saving}" @change="${this.onLink}">
            <option value="" ?selected="${!this.form.userId}">
              ${msg('Not linked', { id: 'pages.admin.not-linked' })}
            </option>
            ${this.linkable.map(
              (member) =>
                html`<option value="${member.id}" ?selected="${member.id === this.form.userId}">
                  ${member.fullName || member.email} (${member.email})
                </option>`,
            )}
          </select>
        </label>
        ${this.linkError ? html`<p class="error" role="alert">${this.linkError}</p>` : nothing}

        <div>
          <p class="label">${msg('Photo', { id: 'pages.account.photo' })}</p>
          <div class="photo">
            <div class="photo-preview">
              ${
                this.photoPreview
                  ? html`<img src="${this.photoPreview}" alt="" aria-hidden="true" />`
                  : msg('No photo', { id: 'pages.admin.no-photo' })
              }
            </div>
            <div>
              <hb-button variant="outlined" ?disabled="${this.saving}" @click="${this.choosePhoto}">
                ${
                  this.photoPreview
                    ? msg('Change photo', { id: 'pages.account.photo-change' })
                    : msg('Choose photo', { id: 'pages.admin.photo-choose' })
                }
              </hb-button>
              <input
                type="file"
                accept="${LOGO_ACCEPT}"
                aria-label="${msg('Choose a photo', { id: 'pages.account.photo-choose' })}"
                @change="${this.onPhotoChosen}"
              />
            </div>
          </div>
          ${this.photoError ? html`<p class="error" role="alert">${this.photoError}</p>` : nothing}
        </div>

        <div class="row">
          ${this.text('linkedinUrl', 'LinkedIn')} ${this.text('githubUrl', 'GitHub')}
          ${this.text('twitterUrl', 'X')}
          ${this.text('websiteUrl', msg('Website', { id: 'pages.account.website' }))}
        </div>
      </div>
      <div slot="actions">
        <hb-button variant="text" ?disabled="${this.saving}" @click="${this.closeForm}">
          ${msg('Cancel', { id: 'pages.account.cancel' })}
        </hb-button>
        <hb-button ?disabled="${this.saving}" @click="${this.save}">
          ${
            this.saving
              ? msg('Saving...', { id: 'pages.account.saving' })
              : this.editing
                ? msg('Save changes', { id: 'pages.admin.save-changes' })
                : msg('Add', { id: 'pages.admin.add' })
          }
        </hb-button>
      </div>
    </hb-dialog>`;
  }

  private readonly onLink = (event: Event) => {
    this.form = { ...this.form, userId: (event.target as HTMLSelectElement).value };
    this.linkError = '';
  };

  private readonly choosePhoto = () => {
    this.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]')?.click();
  };

  private readonly onPhotoChosen = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const problem = logoProblem(file);
    if (problem) {
      this.photoError =
        problem === 'type'
          ? msg('Choose a JPG, PNG, WebP or SVG photo.', { id: 'pages.admin.photo-type' })
          : msg('That photo is over 2 MB. Choose a smaller one.', {
              id: 'pages.admin.photo-size',
            });
      return;
    }
    this.photoError = '';
    if (this.photo) URL.revokeObjectURL(this.photoPreview);
    this.photo = file;
    this.photoPreview = URL.createObjectURL(file);
  };

  private readonly save = async () => {
    if (this.saving) return;
    const errors: Errors = {};
    if (!this.form.name.trim()) errors.name = msg('Add a name.', { id: 'pages.admin.name-needed' });
    const links: Record<(typeof LINK_FIELDS)[number], string> = {
      linkedinUrl: '',
      githubUrl: '',
      twitterUrl: '',
      websiteUrl: '',
    };
    for (const field of LINK_FIELDS) {
      const link = normalizeProfileUrl(this.form[field], LINK_HOSTS[field]);
      if (!link) continue;
      if ('error' in link) {
        errors[field] =
          link.error === 'host'
            ? msg('This link is for a different site.', { id: 'pages.account.link-host' })
            : msg('Enter a web address, such as example.com.', {
                id: 'pages.account.link-invalid',
              });
      } else links[field] = link.url;
    }
    this.errors = errors;
    if (Object.keys(errors).length) return;
    this.saving = true;
    try {
      await saveBoardMember(
        {
          ...(this.editing ? { id: this.editing.id } : {}),
          name: this.form.name,
          title: this.form.title,
          ...links,
          userId: this.form.userId || undefined,
          ...(this.photo ? { photo: this.photo } : {}),
        },
        this.editing,
      );
      await this.load();
      this.formOpen = false;
      store.dispatch(queueSnackbar(msg('Saved.', { id: 'pages.admin.saved' })));
    } catch (error) {
      if (error instanceof CardLinkTakenError) {
        this.linkError = msg('That member already has a card. Choose someone else.', {
          id: 'pages.admin.link-taken',
        });
      } else {
        store.dispatch(
          queueSnackbar(
            msg('An error has occurred. Please, try again later.', {
              id: 'common.general-error',
            }),
          ),
        );
      }
    } finally {
      this.saving = false;
    }
  };

  private renderDeleteDialog() {
    const { deleting } = this;
    return html`<hb-dialog
      heading="${deleting ? msg(str`Delete ${deleting.name}?`, { id: 'pages.admin.delete-title' }) : ''}"
      ?open="${deleting !== undefined}"
      @close="${this.cancelDelete}"
    >
      <div class="confirm">
        <p>
          ${msg('The card and its photo are deleted. This cannot be undone.', {
            id: 'pages.admin.delete-card-body',
          })}
        </p>
      </div>
      <div slot="actions">
        <hb-button variant="text" ?disabled="${this.busy}" @click="${this.cancelDelete}">
          ${msg('Cancel', { id: 'pages.account.cancel' })}
        </hb-button>
        <hb-button ?disabled="${this.busy}" @click="${this.confirmDelete}">
          ${
            this.busy
              ? msg('Deleting...', { id: 'pages.admin.deleting' })
              : msg('Delete', { id: 'pages.admin.delete' })
          }
        </hb-button>
      </div>
    </hb-dialog>`;
  }

  private readonly cancelDelete = () => {
    if (!this.busy) this.deleting = undefined;
  };

  private readonly confirmDelete = async () => {
    const { deleting } = this;
    if (!deleting || this.busy) return;
    this.busy = true;
    try {
      await deleteBoardMember(deleting);
      this.cards = this.cards.filter(({ id }) => id !== deleting.id);
      this.deleting = undefined;
      store.dispatch(queueSnackbar(msg('Deleted.', { id: 'pages.admin.deleted' })));
    } catch {
      store.dispatch(
        queueSnackbar(
          msg('An error has occurred. Please, try again later.', { id: 'common.general-error' }),
        ),
      );
    } finally {
      this.busy = false;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-boards': AdminBoards;
  }
}
