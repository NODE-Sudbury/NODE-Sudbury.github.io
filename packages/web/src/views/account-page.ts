import { Success } from '@abraham/remotedata';
import { msg, str } from '@lit/localize';
import { css, html, nothing, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../components/hero/hero-block';
import { heroText } from '../components/hero/hero-block';
import { PAGE_TONES } from '../components/hero/simple-hero';
import '../components/ui/hb-button';
import '../components/ui/hb-progress';
import '../components/ui/hb-switch';
import '../components/ui/hb-text-field';
import type { HbSwitch } from '../components/ui/hb-switch';
import type { HbTextField } from '../components/ui/hb-text-field';
import { fromStore } from '../controllers/from-store';
import { fetchOwnProfile, HandleTakenError, saveOwnProfile } from '../db/member-profiles';
import type { MemberProfile } from '../models/member-profile';
import { store } from '../store';
import { openSigninDialog } from '../store/dialogs';
import { queueSnackbar } from '../store/snackbars';
import type { UserState } from '../store/user';
import { profile as profileStyles } from '../styles/profile';
import { displayFont } from '../styles/shared';
import { handleProblem, type HandleProblem, normalizeProfileUrl } from '../utils/member-profile';
import { updateTextMetadata } from '../utils/metadata';
import { ThemedComponent } from '../components/themed-component';

type Field = keyof MemberProfile;
type Errors = Partial<Record<Field, string>>;

const EMPTY: MemberProfile = {
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

      form {
        display: grid;
        gap: var(--hb-space-5);
        max-inline-size: 40rem;
      }

      fieldset {
        display: grid;
        gap: var(--hb-space-4);
        margin: 0;
        padding: 0;
        border: 0;
      }

      legend {
        margin-block-end: var(--hb-space-2);
        padding: 0;
        ${displayFont('heading', 'lg', 1.2)};
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
        gap: var(--hb-space-4);
      }

      .address {
        margin: 0;
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-sm);
      }

      .address a {
        color: inherit;
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
  @state()
  private accessor loading = false;
  @state()
  private accessor saving = false;
  @state()
  private accessor errors: Errors = {};
  @state()
  private accessor savedHandle = '';

  private loadedFor: string | undefined;

  override firstUpdated() {
    updateTextMetadata(
      msg('My profile', { id: 'pages.account.title' }),
      msg('Your NODE member profile and public page.', { id: 'pages.account.description' }),
    );
  }

  override updated(_changed: PropertyValues) {
    const uid = this.user instanceof Success ? this.user.data.uid : undefined;
    if (uid && uid !== this.loadedFor) {
      this.loadedFor = uid;
      void this.load(uid);
    } else if (!uid) {
      this.loadedFor = undefined;
      this.form = EMPTY;
    }
  }

  private async load(uid: string) {
    this.loading = true;
    try {
      const own = await fetchOwnProfile(uid);
      this.form = own ?? EMPTY;
      this.savedHandle = own?.isPublic ? own.handle : '';
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
          ${msg('Tell other members who you are, and choose your public page.', {
            id: 'pages.account.lede',
          })}
        </p>
      </hero-block>

      <div class="inner">
        ${this.user instanceof Success ? this.renderForm() : this.renderSignedOut()}
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
      error="${this.errors[field] ?? ''}"
      ?disabled="${this.saving}"
      @input="${(event: Event) => this.set(field, (event.target as HbTextField).value)}"
      hint="${extra['hint'] ?? ''}"
      autocomplete="${extra['autocomplete'] ?? 'off'}"
    ></hb-text-field>`;
  }

  private renderForm() {
    const { form } = this;
    const student = form.memberType === 'student';
    return html`
      <hb-progress ?hidden="${!this.loading}"></hb-progress>
      <form @submit="${(event: Event) => event.preventDefault()}" ?inert="${this.loading}">
        <fieldset>
          <legend>${msg('About you', { id: 'pages.account.about' })}</legend>
          <div class="row">
            ${this.text('fullName', msg('Name', { id: 'pages.account.name' }), {
              autocomplete: 'name',
            })}
            ${this.text('pronouns', msg('Pronouns', { id: 'pages.account.pronouns' }))}
          </div>
          <hb-switch
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
          }
          <hb-text-field
            type="textarea"
            rows="4"
            maxlength="600"
            label="${msg('About', { id: 'pages.account.bio' })}"
            name="bio"
            .value="${form.bio}"
            ?disabled="${this.saving}"
            @input="${(event: Event) => this.set('bio', (event.target as HbTextField).value)}"
          ></hb-text-field>
        </fieldset>

        <fieldset>
          <legend>${msg('Links', { id: 'pages.account.links' })}</legend>
          ${this.text('linkedinUrl', 'LinkedIn')} ${this.text('githubUrl', 'GitHub')}
          ${this.text('twitterUrl', 'X')}
          ${this.text('websiteUrl', msg('Website', { id: 'pages.account.website' }))}
          ${this.text('discordTag', 'Discord', {
            hint: msg('Shown only to you for now.', { id: 'pages.account.discord-hint' }),
          })}
        </fieldset>

        <fieldset>
          <legend>${msg('Your public page', { id: 'pages.account.public' })}</legend>
          ${this.text('handle', msg('Handle', { id: 'pages.account.handle' }), {
            hint: msg('Your page will be at /members/ followed by this.', {
              id: 'pages.account.handle-hint',
            }),
          })}
          <hb-switch
            .checked="${form.isPublic}"
            ?disabled="${this.saving}"
            @change="${(event: Event) => this.setForm({ isPublic: (event.target as HbSwitch).checked })}"
          >
            ${msg('Show my profile to everyone', { id: 'pages.account.visible' })}
          </hb-switch>
          ${
            this.savedHandle
              ? html`<p class="address">
                  ${msg('Your page:', { id: 'pages.account.your-page' })}
                  <a href="/members/${this.savedHandle}">/members/${this.savedHandle}</a>
                </p>`
              : nothing
          }
        </fieldset>

        <div class="actions">
          <hb-button ?disabled="${this.saving || this.loading}" @click="${this.save}">
            ${
              this.saving
                ? msg('Saving...', { id: 'pages.account.saving' })
                : msg('Save profile', { id: 'pages.account.save' })
            }
          </hb-button>
        </div>
      </form>
    `;
  }

  private setForm(values: Partial<MemberProfile>) {
    this.form = { ...this.form, ...values };
  }

  private set(field: Field, value: string) {
    this.setForm({ [field]: value });
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

  private readonly save = async () => {
    if (!(this.user instanceof Success) || this.saving) return;
    const result = this.checked();
    if ('errors' in result) {
      this.errors = result.errors;
      return;
    }
    this.saving = true;
    this.errors = {};
    try {
      await saveOwnProfile(this.user.data.uid, result.profile);
      this.form = result.profile;
      this.savedHandle = result.profile.isPublic ? result.profile.handle : '';
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
