import { msg } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fetchSocialLinks, saveSocialLinks } from '../../db/admin-settings';
import {
  EMPTY_SOCIAL_LINKS,
  SOCIAL_KEYS,
  type SocialKey,
  type SocialLinks,
} from '../../models/site-settings';
import { store } from '../../store';
import { queueSnackbar } from '../../store/snackbars';
import { normalizeProfileUrl } from '../../utils/member-profile';
import { ThemedComponent } from '../themed-component';
import '../shared/node-icon';
import '../ui/hb-button';
import '../ui/hb-progress';
import '../ui/hb-text-field';
import type { HbTextField } from '../ui/hb-text-field';

/** The sites each box takes, so the X box only takes X, and the network's name and icon. */
const NETWORKS: Record<SocialKey, { name: string; icon: string; hosts: readonly string[] }> = {
  social_x: { name: 'X', icon: 'x', hosts: ['x.com', 'twitter.com'] },
  social_instagram: { name: 'Instagram', icon: 'instagram', hosts: ['instagram.com'] },
  social_facebook: { name: 'Facebook', icon: 'facebook', hosts: ['facebook.com', 'fb.com'] },
  social_linkedin: { name: 'LinkedIn', icon: 'linkedin', hosts: ['linkedin.com'] },
};

type Errors = Partial<Record<SocialKey, string>>;

/**
 * The General tab of Settings: NODE's social links, which the footer shows under "Follow us". A box
 * left empty hides that network from the footer.
 */
@customElement('admin-general')
export class AdminGeneral extends ThemedComponent {
  static override styles = css`
    :host {
      display: grid;
      gap: var(--hb-space-5);
      max-inline-size: 40rem;
    }

    h2 {
      margin: 0;
      font-size: var(--hb-text-lg);
    }

    .note {
      margin: 0;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      line-height: 1.5;
    }

    form {
      display: grid;
      gap: var(--hb-space-4);
    }

    .field {
      display: grid;
      grid-template-columns: 2rem minmax(0, 1fr);
      align-items: start;
      gap: var(--hb-space-3);
    }

    .field node-icon {
      inline-size: 1.5rem;
      block-size: 1.5rem;
      margin-block-start: 2rem;
      color: var(--hb-color-on-surface-variant);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--hb-space-3);
    }

    .error {
      margin: 0;
      color: var(--hb-color-error);
      font-size: var(--hb-text-sm);
    }
  `;

  // What is saved, to tell whether anything changed.
  @state()
  private accessor saved: SocialLinks = EMPTY_SOCIAL_LINKS;
  @state()
  private accessor links: SocialLinks = EMPTY_SOCIAL_LINKS;
  @state()
  private accessor errors: Errors = {};
  @state()
  private accessor loading = true;
  @state()
  private accessor failed = false;
  @state()
  private accessor saving = false;

  override async firstUpdated() {
    try {
      this.saved = await fetchSocialLinks();
      this.links = this.saved;
    } catch {
      this.failed = true;
    } finally {
      this.loading = false;
    }
  }

  private get changed() {
    return SOCIAL_KEYS.some((key) => this.links[key] !== this.saved[key]);
  }

  override render() {
    if (this.loading) return html`<hb-progress></hb-progress>`;
    return html`
      <h2>${msg('Follow us links', { id: 'pages.admin.general-title' })}</h2>
      <p class="note">
        ${msg(
          'These are the links under "Follow us" in the footer of every page. Leave a box empty to hide that network from the footer. Changes show on the public site after the next deploy.',
          { id: 'pages.admin.general-note' },
        )}
      </p>
      ${
        this.failed
          ? html`<p class="error" role="alert">
              ${msg('The links could not be loaded. Please, try again later.', {
                id: 'pages.admin.general-failed',
              })}
            </p>`
          : this.renderForm()
      }
    `;
  }

  private renderForm() {
    return html`<form @submit="${(event: Event) => event.preventDefault()}" novalidate>
      ${SOCIAL_KEYS.map((key) => {
        const { name, icon } = NETWORKS[key];
        return html`<div class="field">
          <node-icon name="${icon}"></node-icon>
          <hb-text-field
            label="${name}"
            name="${key}"
            autocomplete="off"
            .value="${this.links[key]}"
            error="${this.errors[key] ?? ''}"
            hint="${this.links[key] ? '' : msg('Empty: hidden from the footer.', { id: 'pages.admin.general-hidden' })}"
            ?disabled="${this.saving}"
            @input="${(event: Event) => this.setLink(key, (event.target as HbTextField).value)}"
          ></hb-text-field>
        </div>`;
      })}
      <div class="actions">
        <hb-button ?disabled="${this.saving || !this.changed}" @click="${this.save}">
          ${
            this.saving
              ? msg('Saving...', { id: 'pages.account.saving' })
              : msg('Save', { id: 'pages.account.save' })
          }
        </hb-button>
        ${
          this.changed
            ? html`<hb-button variant="text" ?disabled="${this.saving}" @click="${this.reset}">
                ${msg('Cancel', { id: 'pages.account.cancel' })}
              </hb-button>`
            : nothing
        }
      </div>
    </form>`;
  }

  private setLink(key: SocialKey, value: string) {
    this.links = { ...this.links, [key]: value };
    if (this.errors[key]) this.errors = { ...this.errors, [key]: undefined };
  }

  private readonly reset = () => {
    this.links = this.saved;
    this.errors = {};
  };

  private readonly save = async () => {
    if (this.saving) return;
    const errors: Errors = {};
    const clean = { ...EMPTY_SOCIAL_LINKS };
    for (const key of SOCIAL_KEYS) {
      const link = normalizeProfileUrl(this.links[key], NETWORKS[key].hosts);
      if (!link) continue;
      if ('error' in link) {
        errors[key] =
          link.error === 'host'
            ? msg('This link is for a different site.', { id: 'pages.account.link-host' })
            : msg('Enter a web address, such as example.com.', {
                id: 'pages.account.link-invalid',
              });
      } else clean[key] = link.url;
    }
    this.errors = errors;
    if (Object.keys(errors).length) return;
    this.saving = true;
    try {
      await saveSocialLinks(clean);
      this.saved = clean;
      this.links = clean;
      store.dispatch(
        queueSnackbar(
          msg('Saved. The footer shows the new links after the next deploy.', {
            id: 'pages.admin.general-saved',
          }),
        ),
      );
    } catch {
      store.dispatch(
        queueSnackbar(
          msg('An error has occurred. Please, try again later.', { id: 'common.general-error' }),
        ),
      );
    } finally {
      this.saving = false;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-general': AdminGeneral;
  }
}
