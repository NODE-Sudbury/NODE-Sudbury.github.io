import { msg } from '@lit/localize';
import { css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fetchOrganization, saveOrganization } from '../../db/admin-organizations';
import {
  type Organization,
  type OrganizationKind,
  SPONSOR_TIERS,
  type SponsorTier,
} from '../../models/organization';
import { store } from '../../store';
import { queueSnackbar } from '../../store/snackbars';
import { LOGO_ACCEPT, logoProblem } from '../../utils/organization';
import { normalizeProfileUrl } from '../../utils/member-profile';
import { ThemedComponent } from '../themed-component';
import '../ui/hb-button';
import '../ui/hb-progress';
import '../ui/hb-text-field';
import type { HbTextField } from '../ui/hb-text-field';

type Errors = { name?: string; websiteUrl?: string };

const tierLabel = (tier: SponsorTier) =>
  ({
    platinum: msg('Platinum', { id: 'pages.admin.tier-platinum' }),
    gold: msg('Gold', { id: 'pages.admin.tier-gold' }),
    silver: msg('Silver', { id: 'pages.admin.tier-silver' }),
    bronze: msg('Bronze', { id: 'pages.admin.tier-bronze' }),
    community: msg('Community', { id: 'pages.admin.tier-community' }),
  })[tier];

/**
 * The form to add a sponsor or partner, or to change one. The address says which: `?kind=` is
 * `sponsor` or `partner`, and an `?id=` means an existing one is being edited.
 */
@customElement('admin-organization-form')
export class AdminOrganizationForm extends ThemedComponent {
  static override styles = css`
    :host {
      display: block;
    }

    form {
      display: grid;
      gap: var(--hb-space-5);
      max-inline-size: 36rem;
    }

    fieldset {
      display: grid;
      gap: var(--hb-space-3);
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend,
    .label {
      margin: 0 0 var(--hb-space-2);
      padding: 0;
      font-weight: 600;
    }

    .kinds {
      display: flex;
      gap: var(--hb-space-4);
    }

    .kinds label,
    .tier {
      display: flex;
      align-items: center;
      gap: var(--hb-space-2);
    }

    .tier {
      flex-wrap: wrap;
    }

    select {
      min-block-size: var(--hb-target-min);
      padding: var(--hb-space-1) var(--hb-space-3);
      border: var(--hb-border-width) solid var(--hb-border-color);
      border-radius: var(--hb-radius-control);
      background-color: var(--hb-color-surface-container);
      color: inherit;
      font: inherit;
    }

    .logo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--hb-space-4);
    }

    .preview {
      display: grid;
      inline-size: 10rem;
      block-size: 6rem;
      overflow: hidden;
      border: var(--hb-border-width) dashed var(--hb-border-color);
      border-radius: var(--hb-radius-l);
      background-color: var(--hb-color-surface-container);
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
      place-items: center;
      text-align: center;
    }

    .preview img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: contain;
    }

    .note {
      margin: 0;
      color: var(--hb-color-on-surface-variant);
      font-size: var(--hb-text-sm);
    }

    .error {
      margin: 0;
      color: var(--hb-color-error);
      font-size: var(--hb-text-sm);
    }

    input[type='file'] {
      display: none;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--hb-space-3);
    }
  `;

  @state()
  private accessor kind: OrganizationKind = 'sponsor';
  @state()
  private accessor editing: Organization | undefined;
  @state()
  private accessor loading = false;
  @state()
  private accessor missing = false;
  @state()
  private accessor saving = false;
  @state()
  private accessor name = '';
  @state()
  private accessor websiteUrl = '';
  @state()
  private accessor tier: SponsorTier = 'community';
  @state()
  private accessor logo: File | undefined;
  @state()
  private accessor logoPreview = '';
  @state()
  private accessor logoError = '';
  @state()
  private accessor errors: Errors = {};

  // Set from the address after the first render, so the server's page and the first one match.
  private idToEdit: string | undefined;
  private tabQuery = '';

  override async firstUpdated() {
    const params = new URLSearchParams(window.location.search);
    this.kind = params.get('kind') === 'partner' ? 'partner' : 'sponsor';
    this.tabQuery = params.get('tab') === 'partners' ? '?tab=partners' : '';
    this.idToEdit = params.get('id') ?? undefined;
    if (!this.idToEdit) return;
    this.loading = true;
    try {
      const found = await fetchOrganization(this.kind, this.idToEdit);
      if (!found) {
        this.missing = true;
        return;
      }
      this.editing = found;
      this.name = found.name;
      this.websiteUrl = found.websiteUrl;
      this.tier = found.tier ?? 'community';
      this.logoPreview = found.logoUrl;
    } catch {
      this.missing = true;
    } finally {
      this.loading = false;
    }
  }

  override disconnectedCallback() {
    if (this.logo) URL.revokeObjectURL(this.logoPreview);
    super.disconnectedCallback();
  }

  private get backHref() {
    return `/admin/sponsors${this.tabQuery}`;
  }

  override render() {
    if (this.loading) return html`<hb-progress></hb-progress>`;
    if (this.missing) {
      return html`<p>
          ${msg('That sponsor or partner could not be found.', { id: 'pages.admin.org-missing' })}
        </p>
        <hb-button variant="outlined" href="${this.backHref}">
          ${msg('Back to sponsors', { id: 'pages.admin.back-sponsors' })}
        </hb-button>`;
    }
    const sponsor = this.kind === 'sponsor';
    return html`<form @submit="${(event: Event) => event.preventDefault()}" novalidate>
      <fieldset>
        <legend>${msg('Type', { id: 'pages.admin.col-type' })}</legend>
        <div class="kinds">
          ${(['sponsor', 'partner'] as const).map(
            (kind) =>
              html`<label>
                <input
                  type="radio"
                  name="kind"
                  value="${kind}"
                  .checked="${this.kind === kind}"
                  ?disabled="${this.editing !== undefined || this.saving}"
                  @change="${() => (this.kind = kind)}"
                />
                ${
                  kind === 'sponsor'
                    ? msg('Sponsor', { id: 'pages.admin.kind-sponsor-title' })
                    : msg('Partner', { id: 'pages.admin.kind-partner-title' })
                }
              </label>`,
          )}
        </div>
      </fieldset>

      <hb-text-field
        label="${msg('Name', { id: 'pages.account.name' })}"
        name="name"
        required
        maxlength="120"
        .value="${this.name}"
        error="${this.errors.name ?? ''}"
        ?disabled="${this.saving}"
        @input="${(event: Event) => this.setField('name', (event.target as HbTextField).value)}"
      ></hb-text-field>

      <hb-text-field
        label="${msg('Website', { id: 'pages.account.website' })}"
        name="websiteUrl"
        autocomplete="off"
        .value="${this.websiteUrl}"
        error="${this.errors.websiteUrl ?? ''}"
        ?disabled="${this.saving}"
        @input="${(event: Event) =>
          this.setField('websiteUrl', (event.target as HbTextField).value)}"
      ></hb-text-field>

      ${
        sponsor
          ? html`<label class="tier">
              <span class="label">${msg('Tier', { id: 'pages.admin.col-tier' })}</span>
              <select ?disabled="${this.saving}" @change="${this.onTier}">
                ${SPONSOR_TIERS.map(
                  (tier) =>
                    html`<option value="${tier}" ?selected="${tier === this.tier}">
                      ${tierLabel(tier)}
                    </option>`,
                )}
              </select>
            </label>`
          : nothing
      }

      <div>
        <p class="label">${msg('Logo', { id: 'pages.admin.col-logo' })}</p>
        <div class="logo">
          <div class="preview">
            ${
              this.logoPreview
                ? html`<img src="${this.logoPreview}" alt="" aria-hidden="true" />`
                : msg('No logo yet', { id: 'pages.admin.no-logo' })
            }
          </div>
          <div>
            <hb-button variant="outlined" ?disabled="${this.saving}" @click="${this.chooseLogo}">
              ${
                this.logoPreview
                  ? msg('Change logo', { id: 'pages.admin.logo-change' })
                  : msg('Choose logo', { id: 'pages.admin.logo-choose' })
              }
            </hb-button>
            <input
              type="file"
              accept="${LOGO_ACCEPT}"
              aria-label="${msg('Choose a logo', { id: 'pages.admin.logo-input' })}"
              @change="${this.onLogoChosen}"
            />
          </div>
        </div>
        <p class="note">
          ${msg('JPG, PNG, WebP or SVG, up to 2 MB.', { id: 'pages.admin.logo-note' })}
        </p>
        ${this.logoError ? html`<p class="error" role="alert">${this.logoError}</p>` : nothing}
      </div>

      <div class="actions">
        <hb-button ?disabled="${this.saving}" @click="${this.save}">
          ${
            this.saving
              ? msg('Saving...', { id: 'pages.account.saving' })
              : this.editing
                ? msg('Save changes', { id: 'pages.admin.save-changes' })
                : msg('Add', { id: 'pages.admin.add' })
          }
        </hb-button>
        <hb-button variant="text" href="${this.backHref}" ?disabled="${this.saving}">
          ${msg('Cancel', { id: 'pages.account.cancel' })}
        </hb-button>
      </div>
    </form>`;
  }

  private setField(field: 'name' | 'websiteUrl', value: string) {
    this[field] = value;
    if (this.errors[field]) this.errors = { ...this.errors, [field]: undefined };
  }

  private readonly onTier = (event: Event) => {
    this.tier = (event.target as HTMLSelectElement).value as SponsorTier;
  };

  private readonly chooseLogo = () => {
    this.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]')?.click();
  };

  private readonly onLogoChosen = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const problem = logoProblem(file);
    if (problem) {
      this.logoError =
        problem === 'type'
          ? msg('Choose a JPG, PNG, WebP or SVG logo.', { id: 'pages.admin.logo-type' })
          : msg('That logo is over 2 MB. Choose a smaller one.', { id: 'pages.admin.logo-size' });
      return;
    }
    this.logoError = '';
    if (this.logo) URL.revokeObjectURL(this.logoPreview);
    this.logo = file;
    this.logoPreview = URL.createObjectURL(file);
  };

  private readonly save = async () => {
    if (this.saving) return;
    const errors: Errors = {};
    if (!this.name.trim()) {
      errors.name = msg('Add a name.', { id: 'pages.admin.name-needed' });
    }
    const link = normalizeProfileUrl(this.websiteUrl);
    if (link && 'error' in link) {
      errors.websiteUrl = msg('Enter a web address, such as example.com.', {
        id: 'pages.account.link-invalid',
      });
    }
    this.errors = errors;
    if (Object.keys(errors).length) return;
    this.saving = true;
    try {
      await saveOrganization(
        {
          ...(this.editing ? { id: this.editing.id } : {}),
          kind: this.kind,
          name: this.name,
          websiteUrl: link && 'url' in link ? link.url : '',
          tier: this.kind === 'sponsor' ? this.tier : undefined,
          ...(this.logo ? { logo: this.logo } : {}),
        },
        this.editing,
      );
      store.dispatch(queueSnackbar(msg('Saved.', { id: 'pages.admin.saved' })));
      window.location.assign(
        this.kind === 'partner' ? '/admin/sponsors?tab=partners' : '/admin/sponsors',
      );
    } catch {
      store.dispatch(
        queueSnackbar(
          msg('An error has occurred. Please, try again later.', { id: 'common.general-error' }),
        ),
      );
      this.saving = false;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-organization-form': AdminOrganizationForm;
  }
}
