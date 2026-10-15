import { Success } from '@abraham/remotedata';
import { msg, str } from '@lit/localize';
import { css, html, nothing, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../components/hero/hero-block';
import { heroText } from '../components/hero/hero-block';
import { PAGE_TONES } from '../components/hero/simple-hero';
import '../components/shared/node-icon';
import '../components/shared/speaker-photo';
import '../components/ui/hb-button';
import '../components/ui/hb-chip';
import '../components/ui/hb-icon-button';
import '../components/ui/hb-progress';
import '../components/ui/hb-switch';
import '../components/ui/hb-text-field';
import type { HbSwitch } from '../components/ui/hb-switch';
import type { HbTextField } from '../components/ui/hb-text-field';
import { fromStore } from '../controllers/from-store';
import {
  AVATAR_MAX_BYTES,
  fetchOwnProfile,
  HandleTakenError,
  isHandleAvailable,
  removeAvatar,
  saveOwnProfile,
  uploadAvatar,
} from '../db/member-profiles';
import type { MemberProfile } from '../models/member-profile';
import { store } from '../store';
import { sessionRestored } from '../store/auth';
import { openSigninDialog } from '../store/dialogs';
import { queueSnackbar } from '../store/snackbars';
import type { UserState } from '../store/user';
import { profile as profileStyles } from '../styles/profile';
import { displayFont } from '../styles/shared';
import { avatarProblem, cropToSquare } from '../utils/avatar';
import {
  handleProblem,
  type HandleProblem,
  memberSince,
  normalizeProfileUrl,
  publicPath,
} from '../utils/member-profile';
import { updateTextMetadata } from '../utils/metadata';
import { ThemedComponent } from '../components/themed-component';

type Field = keyof MemberProfile;
type RowId = 'name' | 'work' | 'about' | 'links' | 'handle' | 'visibility';
type Errors = Partial<Record<Field, string>>;

const EMPTY: MemberProfile = {
  id: '',
  createdAt: '',
  isExclusiveMember: false,
  handle: '',
  fullName: '',
  avatarUrl: '',
  memberType: 'professional',
  jobTitle: '',
  company: '',
  school: '',
  program: '',
  bio: '',
  pronouns: '',
  linkedinUrl: '',
  githubUrl: '',
  twitterUrl: '',
  websiteUrl: '',
  discordTag: '',
  isPublic: true,
};

/** The fields each row edits, to tell which row an error belongs to. */
const ROW_FIELDS: Record<RowId, readonly Field[]> = {
  name: ['fullName', 'pronouns'],
  work: ['memberType', 'jobTitle', 'company', 'school', 'program'],
  about: ['bio'],
  links: ['linkedinUrl', 'githubUrl', 'twitterUrl', 'websiteUrl', 'discordTag'],
  handle: ['handle'],
  visibility: ['isPublic'],
};

/** Which site each link box takes, so the LinkedIn box only takes LinkedIn. */
const LINK_HOSTS: Partial<Record<Field, readonly string[]>> = {
  linkedinUrl: ['linkedin.com'],
  githubUrl: ['github.com'],
  twitterUrl: ['x.com', 'twitter.com'],
};

const handleMessage = (problem: HandleProblem) =>
  ({
    'too-short': msg('Use at least 3 characters.', { id: 'pages.account.handle-short' }),
    'too-long': msg('Use at most 30 characters.', { id: 'pages.account.handle-long' }),
    characters: msg('Use only lowercase letters, numbers and hyphens.', {
      id: 'pages.account.handle-characters',
    }),
    edges: msg('Start and end with a letter or number.', { id: 'pages.account.handle-edges' }),
  })[problem];

/** The member's own profile: who they are, their links and their public address. */
@customElement('account-page')
export class AccountPage extends ThemedComponent {
  static override styles = [
    heroText,
    profileStyles,
    css`
      :host {
        display: block;
        background-color: var(--hb-section-background);
        color: var(--hb-color-on-surface);
      }

      .settings {
        display: grid;
        gap: var(--hb-space-8);
        max-inline-size: 44rem;
      }

      .group {
        display: grid;
        margin: 0;
      }

      .group-title {
        margin: 0 0 var(--hb-space-2);
        ${displayFont('heading', 'lg', 1.2)};
      }

      .item {
        display: grid;
        grid-template-columns: minmax(7rem, 11rem) 1fr auto;
        align-items: center;
        gap: var(--hb-space-3) var(--hb-space-4);
        padding-block: var(--hb-space-4);
        border-block-end: var(--hb-border-width) solid var(--hb-border-color);
      }

      .item:last-child {
        border-block-end: 0;
      }

      .item-label {
        font-weight: 600;
      }

      .item-value {
        min-inline-size: 0;
        overflow-wrap: anywhere;
        color: var(--hb-color-on-surface-variant);
      }

      .item-value.empty {
        font-style: italic;
      }

      .item-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: var(--hb-space-2);
        justify-content: flex-end;
      }

      .item.editing {
        grid-template-columns: 1fr;
      }

      .editor {
        display: grid;
        gap: var(--hb-space-4);
      }

      .row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
        gap: var(--hb-space-4);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--hb-space-3);
      }

      .visually-hidden {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }

      @media (max-width: 36rem) {
        .item {
          grid-template-columns: 1fr auto;
        }

        .item-label {
          grid-column: 1 / -1;
        }
      }

      .note {
        margin: 0;
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-sm);
      }

      .membership {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--hb-space-3);
      }

      input[type='file'] {
        display: none;
      }

      .share {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--hb-space-4) var(--hb-space-6);
        padding: var(--hb-space-5);
        border: var(--hb-border-width) solid var(--hb-border-color);
        border-radius: var(--hb-radius-l);
        background-color: var(--hb-panel-background);
        box-shadow: var(--hb-shadow-card);
      }

      .share-text {
        display: grid;
        flex: 1 1 18rem;
        gap: var(--hb-space-2);
        min-inline-size: 0;
      }

      .share-title {
        margin: 0;
        ${displayFont('heading', 'lg', 1.2)};
      }

      .share-body {
        margin: 0;
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-sm);
        line-height: 1.5;
      }

      .share-link {
        display: flex;
        align-items: center;
        gap: var(--hb-space-2);
        min-inline-size: 0;
        margin-block-start: var(--hb-space-1);
        padding: var(--hb-space-2) var(--hb-space-3);
        border-radius: var(--hb-radius-m);
        background-color: var(--hb-color-surface-container);
        font-family: var(--hb-font-mono);
        font-size: var(--hb-text-sm);
      }

      .share-link node-icon {
        flex: none;
        inline-size: 1.25rem;
        block-size: 1.25rem;
        color: var(--hb-color-on-surface-variant);
      }

      .share-link span {
        min-inline-size: 0;
        overflow-wrap: anywhere;
      }

      .share-actions {
        display: flex;
        align-items: center;
        gap: var(--hb-space-2);
      }

      .signed-out {
        display: grid;
        justify-items: start;
        gap: var(--hb-space-4);
      }
    `,
  ];

  @fromStore((state) => state.user)
  private accessor user!: UserState;

  @state()
  private accessor form: MemberProfile = EMPTY;
  // The profile as last saved, which Cancel goes back to.
  private saved: MemberProfile = EMPTY;
  // The row being edited. Only one is open at a time.
  @state()
  private accessor editing: RowId | undefined;
  @state()
  private accessor loading = false;
  @state()
  private accessor saving = false;
  @state()
  private accessor errors: Errors = {};
  @state()
  private accessor savedPath = '';
  @state()
  private accessor savedPublic = true;
  // False on the server and in the first render, so hydration matches whoever is signed in.
  @state()
  private accessor ready = false;
  @state()
  private accessor uploading = false;
  // Whether the handle in the box is free. It is checked a moment after typing stops.
  @state()
  private accessor handleStatus: 'idle' | 'checking' | 'available' | 'taken' = 'idle';
  @state()
  private accessor copied = false;

  private loadedFor: string | undefined;
  private savedHandle = '';
  private handleTimer: ReturnType<typeof setTimeout> | undefined;

  override async firstUpdated() {
    updateTextMetadata(
      msg('My profile', { id: 'pages.account.title' }),
      msg('Your N.O.D.E. member profile and public profile.', { id: 'pages.account.description' }),
    );
    await sessionRestored;
    this.ready = true;
  }

  override updated(_changed: PropertyValues) {
    if (!this.ready) return;
    const uid = this.user instanceof Success ? this.user.data.uid : undefined;
    if (uid && uid !== this.loadedFor) {
      this.loadedFor = uid;
      void this.load(uid);
    } else if (!uid) {
      this.loadedFor = undefined;
      this.form = EMPTY;
      this.saved = EMPTY;
      this.editing = undefined;
    }
  }

  private async load(uid: string) {
    this.loading = true;
    try {
      const own = await fetchOwnProfile(uid);
      this.form = own ?? EMPTY;
      this.saved = this.form;
      this.savedPath = own ? publicPath(own) : '';
      this.savedPublic = own?.isPublic ?? true;
      this.savedHandle = own?.handle ?? '';
    } catch {
      store.dispatch(queueSnackbar(this.generalError()));
    } finally {
      this.loading = false;
    }
  }

  private generalError = () =>
    msg('An error has occurred. Please, try again later.', { id: 'common.general-error' });

  override render() {
    return html`
      <hero-block tone="${PAGE_TONES.team}">
        <h1 class="hero-title">${msg('My profile', { id: 'pages.account.title' })}</h1>
        <p class="hero-description">
          ${msg('Tell other members who you are, and choose your public profile.', {
            id: 'pages.account.lede',
          })}
        </p>
      </hero-block>

      <div class="inner">
        ${
          !this.ready
            ? html`<hb-progress></hb-progress>`
            : this.user instanceof Success
              ? this.renderForm()
              : this.renderSignedOut()
        }
      </div>
    `;
  }

  private renderSignedOut() {
    return html`
      <div class="signed-out">
        <p>${msg('Sign in to edit your profile.', { id: 'pages.account.sign-in-needed' })}</p>
        <hb-button @click="${() => openSigninDialog()}">
          ${msg('Sign in', { id: 'common.sign-in' })}
        </hb-button>
      </div>
    `;
  }

  private text(field: Field, label: string, extra: Record<string, string> = {}) {
    return html`<hb-text-field
      label="${label}"
      name="${field}"
      .value="${String(this.form[field])}"
      error="${extra['error'] || this.errors[field] || ''}"
      ?disabled="${this.saving}"
      @input="${(event: Event) => this.set(field, (event.target as HbTextField).value)}"
      hint="${extra['hint'] ?? ''}"
      autocomplete="${extra['autocomplete'] ?? 'off'}"
    ></hb-text-field>`;
  }

  private renderForm() {
    const { saved } = this;
    const student = saved.memberType === 'student';
    const links = (
      [
        ['LinkedIn', saved.linkedinUrl],
        ['GitHub', saved.githubUrl],
        ['X', saved.twitterUrl],
        [msg('Website', { id: 'pages.account.website' }), saved.websiteUrl],
        ['Discord', saved.discordTag],
      ] as const
    )
      .filter(([, value]) => value)
      .map(([name]) => name);
    const work = student
      ? [saved.program, saved.school].filter(Boolean).join(' - ')
      : [saved.jobTitle, saved.company].filter(Boolean).join(' - ');
    return html`
      <hb-progress ?hidden="${!this.loading}"></hb-progress>
      <div class="settings" ?inert="${this.loading}">
        ${this.renderShare()}

        <section class="group" aria-labelledby="group-profile">
          <h2 class="group-title" id="group-profile">
            ${msg('Profile', { id: 'pages.account.profile' })}
          </h2>
          ${this.renderPhoto()}
          ${this.renderRow(
            'name',
            msg('Name', { id: 'pages.account.name' }),
            [saved.fullName, saved.pronouns && `(${saved.pronouns})`].filter(Boolean).join(' '),
            html`<div class="row">
              ${this.text('fullName', msg('Name', { id: 'pages.account.name' }), {
                autocomplete: 'name',
              })}
              ${this.text('pronouns', msg('Pronouns', { id: 'pages.account.pronouns' }))}
            </div>`,
          )}
          ${this.renderRow(
            'work',
            student
              ? msg('School', { id: 'pages.account.school' })
              : msg('Work', { id: 'pages.account.work' }),
            work,
            this.renderWorkEditor(),
          )}
          ${this.renderRow(
            'about',
            msg('About', { id: 'pages.account.bio' }),
            saved.bio,
            html`<hb-text-field
              type="textarea"
              rows="4"
              maxlength="600"
              label="${msg('About', { id: 'pages.account.bio' })}"
              name="bio"
              .value="${this.form.bio}"
              ?disabled="${this.saving}"
              @input="${(event: Event) => this.set('bio', (event.target as HbTextField).value)}"
            ></hb-text-field>`,
          )}
          ${this.renderRow(
            'links',
            msg('Links', { id: 'pages.account.links' }),
            links.join(', '),
            html`${this.text('linkedinUrl', 'LinkedIn')} ${this.text('githubUrl', 'GitHub')}
            ${this.text('twitterUrl', 'X')}
            ${this.text('websiteUrl', msg('Website', { id: 'pages.account.website' }))}
            ${this.text('discordTag', 'Discord', {
              hint: msg('Shown only to you for now.', { id: 'pages.account.discord-hint' }),
            })}`,
          )}
        </section>

        <section class="group" aria-labelledby="group-public">
          <h2 class="group-title" id="group-public">
            ${msg('Public profile', { id: 'pages.account.public' })}
          </h2>
          ${this.renderRow(
            'handle',
            msg('Handle', { id: 'pages.account.handle' }),
            saved.handle ? `/members/${saved.handle}` : '',
            this.text('handle', msg('Handle', { id: 'pages.account.handle' }), {
              hint: this.handleHint(),
              error: this.handleStatus === 'taken' ? this.handleTakenMessage() : '',
            }),
          )}
          ${this.renderRow(
            'visibility',
            msg('Visibility', { id: 'pages.account.visibility' }),
            saved.isPublic
              ? msg('Public: anyone with the link can see it.', {
                  id: 'pages.account.visibility-public',
                })
              : msg('Private: only you can see it.', { id: 'pages.account.visibility-private' }),
            html`<hb-switch
              .checked="${this.form.isPublic}"
              ?disabled="${this.saving}"
              @change="${(event: Event) =>
                this.setForm({ isPublic: (event.target as HbSwitch).checked })}"
            >
              ${msg('Show my profile to everyone', { id: 'pages.account.visible' })}
            </hb-switch>`,
          )}
        </section>

        <section class="group" aria-labelledby="group-membership">
          <h2 class="group-title" id="group-membership">
            ${msg('Membership', { id: 'pages.account.membership' })}
          </h2>
          <div class="item">
            <span class="item-label">${msg('Status', { id: 'pages.account.status' })}</span>
            <span class="item-value membership">
              ${
                saved.createdAt
                  ? msg(str`Member since ${memberSince(saved.createdAt)}`, {
                      id: 'pages.account.member-since',
                    })
                  : nothing
              }
              ${
                saved.isExclusiveMember
                  ? html`<hb-chip accent="1">
                      ${msg('Exclusive member', { id: 'pages.account.exclusive' })}
                    </hb-chip>`
                  : nothing
              }
            </span>
          </div>
        </section>
      </div>
    `;
  }

  private renderWorkEditor() {
    const student = this.form.memberType === 'student';
    return html`<hb-switch
        .checked="${student}"
        ?disabled="${this.saving}"
        @change="${(event: Event) =>
          this.setForm({
            memberType: (event.target as HbSwitch).checked ? 'student' : 'professional',
          })}"
      >
        ${msg("I'm a student", { id: 'pages.account.student' })}
      </hb-switch>
      ${
        student
          ? html`<div class="row">
              ${this.text('program', msg('Program', { id: 'pages.account.program' }))}
              ${this.text('school', msg('School', { id: 'pages.account.school' }))}
            </div>`
          : html`<div class="row">
              ${this.text('jobTitle', msg('Job title', { id: 'pages.account.job-title' }))}
              ${this.text('company', msg('Company', { id: 'pages.account.company' }))}
            </div>`
      }`;
  }

  /** One setting: its name and value with an Edit button, or its fields with Save and Cancel. */
  private renderRow(id: RowId, label: string, value: string, editor: unknown) {
    if (this.editing === id) {
      return html`<div class="item editing" role="group" aria-label="${label}">
        <span class="item-label visually-hidden">${label}</span>
        <div class="editor">${editor}</div>
        <div class="actions">
          <hb-button ?disabled="${this.saving}" @click="${this.save}">
            ${
              this.saving
                ? msg('Saving...', { id: 'pages.account.saving' })
                : msg('Save', { id: 'pages.account.save' })
            }
          </hb-button>
          <hb-button variant="text" ?disabled="${this.saving}" @click="${this.cancel}">
            ${msg('Cancel', { id: 'pages.account.cancel' })}
          </hb-button>
        </div>
      </div>`;
    }
    return html`<div class="item">
      <span class="item-label">${label}</span>
      <span class="item-value ${value ? '' : 'empty'}">
        ${value || msg('Not set', { id: 'pages.account.not-set' })}
      </span>
      <hb-button
        variant="outlined"
        ?disabled="${this.editing !== undefined}"
        @click="${() => this.edit(id)}"
      >
        ${msg('Edit', { id: 'pages.account.edit' })}
        <span class="visually-hidden">${label}</span>
      </hb-button>
    </div>`;
  }

  /** The photo is the one setting that saves at once, so it has its own buttons. */
  private renderPhoto() {
    return html`<div class="item">
      <span class="item-label">${msg('Photo', { id: 'pages.account.photo' })}</span>
      <span class="item-value">
        <speaker-photo size="m" src="${this.form.avatarUrl}"></speaker-photo>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="${msg('Choose a photo', { id: 'pages.account.photo-choose' })}"
          @change="${this.onPhotoChosen}"
        />
      </span>
      <span class="item-buttons">
        <hb-button variant="outlined" ?disabled="${this.uploading}" @click="${this.choosePhoto}">
          ${
            this.uploading
              ? msg('Saving photo...', { id: 'pages.account.photo-saving' })
              : msg('Change photo', { id: 'pages.account.photo-change' })
          }
        </hb-button>
        ${
          this.form.avatarUrl
            ? html`<hb-button
                variant="text"
                ?disabled="${this.uploading}"
                @click="${this.removePhoto}"
              >
                ${msg('Remove photo', { id: 'pages.account.photo-remove' })}
              </hb-button>`
            : nothing
        }
      </span>
    </div>`;
  }

  private edit(id: RowId) {
    this.errors = {};
    this.handleStatus = 'idle';
    this.editing = id;
  }

  private readonly cancel = () => {
    clearTimeout(this.handleTimer);
    this.form = this.saved;
    this.errors = {};
    this.handleStatus = 'idle';
    this.editing = undefined;
  };

  /**
   * Where the public profile is, at the top of the page where it is easy to find: the link, a
   * button to copy it and one to open it. It follows what is saved, not what is being typed.
   */
  private renderShare() {
    const address = this.savedPath ? `${window.location.host}${this.savedPath}` : '';
    if (!this.savedPublic || !this.savedPath) {
      return html`<section class="share" aria-labelledby="share-title">
        <div class="share-text">
          <h2 class="share-title" id="share-title">
            ${msg('Your profile is private', { id: 'pages.account.share-private' })}
          </h2>
          <p class="share-body">
            ${msg(
              'Only you can see it right now. Under Public profile, set visibility to public and add a handle to get a link you can share.',
              { id: 'pages.account.share-private-body' },
            )}
          </p>
        </div>
      </section>`;
    }
    const hasHandle = this.savedPath.startsWith('/members/');
    return html`<section class="share" aria-labelledby="share-title">
      <div class="share-text">
        <h2 class="share-title" id="share-title">
          ${msg('Your public profile is live', { id: 'pages.account.share-live' })}
        </h2>
        <p class="share-body">
          ${
            hasHandle
              ? msg(
                  'Share this link on your CV, your LinkedIn or at an event. Anyone can see your photo, name, role, links and bio. Your email stays private.',
                  { id: 'pages.account.share-live-body' },
                )
              : msg(
                  'Add a handle under Public profile to get a short link like /members/your-name. Until then this link works.',
                  { id: 'pages.account.share-live-body-id' },
                )
          }
        </p>
        <div class="share-link">
          <node-icon name="link"></node-icon>
          <span>${address}</span>
        </div>
      </div>
      <div class="share-actions">
        <hb-button variant="outlined" @click="${this.copyLink}">
          <node-icon slot="icon" name="copy"></node-icon>
          ${
            this.copied
              ? msg('Copied', { id: 'pages.account.copied' })
              : msg('Copy link', { id: 'pages.account.copy' })
          }
        </hb-button>
        <hb-icon-button
          variant="tonal"
          href="${this.savedPath}"
          target="_blank"
          label="${msg('Open your public profile in a new tab', { id: 'pages.account.open-page' })}"
        >
          <node-icon name="open-in-new"></node-icon>
        </hb-icon-button>
      </div>
    </section>`;
  }

  private setForm(values: Partial<MemberProfile>) {
    this.form = { ...this.form, ...values };
  }

  private set(field: Field, value: string) {
    this.setForm({ [field]: value });
    if (field === 'handle') this.checkHandleSoon();
    if (this.errors[field]) this.errors = { ...this.errors, [field]: undefined };
  }

  /** The profile ready to save, or what is wrong with it. */
  private checked(): { profile: MemberProfile } | { errors: Errors } {
    const profile = { ...this.form, handle: this.form.handle.trim().toLowerCase() };
    const errors: Errors = {};
    const problem = handleProblem(profile.handle);
    if (problem) errors.handle = handleMessage(problem);
    else if (profile.isPublic && !profile.handle) {
      errors.handle = msg('Choose a handle to show your profile to everyone.', {
        id: 'pages.account.handle-needed',
      });
    }
    if (profile.isPublic && !profile.fullName.trim()) {
      errors.fullName = msg('Add your name to show your profile to everyone.', {
        id: 'pages.account.name-needed',
      });
    }
    for (const field of ['linkedinUrl', 'githubUrl', 'twitterUrl', 'websiteUrl'] as const) {
      const link = normalizeProfileUrl(profile[field], LINK_HOSTS[field]);
      if (!link) profile[field] = '';
      else if ('error' in link) {
        errors[field] =
          link.error === 'host'
            ? msg('This link is for a different site.', { id: 'pages.account.link-host' })
            : msg('Enter a web address, such as example.com.', {
                id: 'pages.account.link-invalid',
              });
      } else profile[field] = link.url;
    }
    return Object.keys(errors).length ? { errors } : { profile };
  }

  /** Looks up the handle once typing stops, so each key press is not a request. */
  private checkHandleSoon() {
    clearTimeout(this.handleTimer);
    const handle = this.form.handle.trim().toLowerCase();
    if (!handle || handleProblem(handle) || handle === this.savedHandle) {
      this.handleStatus = 'idle';
      return;
    }
    this.handleStatus = 'checking';
    this.handleTimer = setTimeout(() => void this.lookUpHandle(handle), 400);
  }

  private async lookUpHandle(handle: string) {
    try {
      const free = await isHandleAvailable(handle);
      // Typing may have moved on while the answer came back.
      if (handle === this.form.handle.trim().toLowerCase()) {
        this.handleStatus = free ? 'available' : 'taken';
      }
    } catch {
      this.handleStatus = 'idle';
    }
  }

  private handleHint() {
    const handle = this.form.handle.trim().toLowerCase();
    if (this.handleStatus === 'checking') {
      return msg('Checking if it is free...', { id: 'pages.account.handle-checking' });
    }
    if (this.handleStatus === 'available') {
      return msg(str`${handle} is available.`, { id: 'pages.account.handle-available' });
    }
    return msg('Your profile will be at /members/ followed by this.', {
      id: 'pages.account.handle-hint',
    });
  }

  private handleTakenMessage() {
    return msg(str`The handle ${this.form.handle.trim().toLowerCase()} is taken. Try another.`, {
      id: 'pages.account.handle-taken',
    });
  }

  private readonly choosePhoto = () => {
    this.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]')?.click();
  };

  private readonly onPhotoChosen = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !(this.user instanceof Success)) return;
    const problem = avatarProblem(file, AVATAR_MAX_BYTES);
    if (problem) {
      store.dispatch(
        queueSnackbar(
          problem === 'type'
            ? msg('Choose a JPG, PNG or WebP photo.', { id: 'pages.account.photo-type' })
            : msg('That photo is over 5 MB. Choose a smaller one.', {
                id: 'pages.account.photo-size',
              }),
        ),
      );
      return;
    }
    this.uploading = true;
    try {
      const url = await uploadAvatar(this.user.data.uid, await cropToSquare(file));
      this.form = { ...this.form, avatarUrl: url };
      this.saved = { ...this.saved, avatarUrl: url };
      store.dispatch(queueSnackbar(msg('Photo saved.', { id: 'pages.account.photo-saved' })));
    } catch {
      store.dispatch(queueSnackbar(this.generalError()));
    } finally {
      this.uploading = false;
    }
  };

  private readonly removePhoto = async () => {
    if (!(this.user instanceof Success)) return;
    this.uploading = true;
    try {
      await removeAvatar(this.user.data.uid);
      this.form = { ...this.form, avatarUrl: '' };
      this.saved = { ...this.saved, avatarUrl: '' };
      store.dispatch(queueSnackbar(msg('Photo removed.', { id: 'pages.account.photo-removed' })));
    } catch {
      store.dispatch(queueSnackbar(this.generalError()));
    } finally {
      this.uploading = false;
    }
  };

  private readonly copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(this.savedPath, window.location.origin).href);
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      store.dispatch(queueSnackbar(this.generalError()));
    }
  };

  private readonly save = async () => {
    if (!(this.user instanceof Success) || this.saving) return;
    if (this.handleStatus === 'taken') {
      this.errors = { ...this.errors, handle: this.handleTakenMessage() };
      return;
    }
    const result = this.checked();
    if ('errors' in result) {
      this.errors = result.errors;
      // An error in a setting that is not open has no field to show it, so say it in a message.
      const open = this.editing ? ROW_FIELDS[this.editing] : [];
      const hidden = Object.keys(result.errors).filter((field) => !open.includes(field as Field));
      if (hidden.length === Object.keys(result.errors).length) {
        store.dispatch(queueSnackbar(Object.values(result.errors)[0] ?? this.generalError()));
      }
      return;
    }
    this.saving = true;
    this.errors = {};
    try {
      await saveOwnProfile(this.user.data.uid, result.profile);
      this.form = result.profile;
      this.saved = result.profile;
      this.editing = undefined;
      this.savedPath = publicPath(result.profile);
      this.savedPublic = result.profile.isPublic;
      this.savedHandle = result.profile.handle;
      this.handleStatus = 'idle';
      store.dispatch(queueSnackbar(msg('Profile saved.', { id: 'pages.account.saved' })));
    } catch (error) {
      if (error instanceof HandleTakenError) {
        this.errors = {
          handle: msg(str`The handle ${result.profile.handle} is taken. Try another.`, {
            id: 'pages.account.handle-taken',
          }),
        };
      } else {
        store.dispatch(queueSnackbar(this.generalError()));
      }
    } finally {
      this.saving = false;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'account-page': AccountPage;
  }
}
