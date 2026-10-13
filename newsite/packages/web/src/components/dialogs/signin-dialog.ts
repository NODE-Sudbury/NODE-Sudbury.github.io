import { Success } from '@abraham/remotedata';
import { msg, str } from '@lit/localize';
import { css, html, nothing, type PropertyValues } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { StoreController } from '../../controllers/store-controller';
import { fromStore } from '../../controllers/from-store';
import { signIn, signInAvailable } from '../../store/auth';
import { closeDialog, DIALOG, selectIsDialogOpen } from '../../store/dialogs';
import { selectOnline } from '../../store/sync';
import { emailLinkSignIn, signInProviders } from '../../config/site';
import type { PROVIDER } from '../../utils/providers';
import { illustration, illustrationStyles } from '../../illustrations/illustration';
import signInArt from '../../illustrations/sign-in.svg?raw';
import '../shared/node-icon';
import '../ui/hb-button';
import '../ui/hb-dialog';
import './email-link-form';
import type { EmailLinkForm } from './email-link-form';
import { ThemedComponent } from '../themed-component';

const signInWith = (provider: string) =>
  msg(str`Sign in with ${provider}`, { id: 'dialogs.signin.sign-in-with' });

@customElement('signin-dialog')
export class SigninDialog extends ThemedComponent {
  static override styles = [
    illustrationStyles,
    css`
      .illustration {
        inline-size: min(100%, 12rem);
        margin: 0 auto var(--hb-space-4);
      }

      .sign-in-button {
        --hb-button-color: var(--hb-color-on-surface);

        margin: 16px 0;
        display: flex;
      }

      .or {
        margin: var(--hb-space-4) 0 0;
        color: var(--hb-color-on-surface-variant);
        text-align: center;
      }

      .offline {
        margin: 0 0 var(--hb-space-4);
        font-weight: 600;
      }
    `,
  ];

  private signInProviders = signInProviders;

  @fromStore((state) => selectIsDialogOpen(state, DIALOG.SIGNIN))
  private accessor open!: boolean;
  @fromStore(selectOnline)
  private accessor online!: boolean;
  @query('email-link-form')
  private accessor emailLinkForm!: EmailLinkForm | null;

  constructor() {
    super();
    new StoreController(this, (state) => state.user instanceof Success, {
      onChange: (signedIn) => {
        if (signedIn && this.open) closeDialog();
      },
    });
  }

  // Each time it opens, the dialog starts again at the email field.
  override willUpdate(changed: PropertyValues) {
    if (changed.has('open') && this.open) {
      this.emailLinkForm?.reset();
    }
  }

  override render() {
    return html`
      <hb-dialog
        heading="${msg('Sign in', { id: 'common.sign-in' })}"
        ?open="${this.open}"
        @close="${() => closeDialog()}"
      >
        ${
          this.online
            ? nothing
            : html`<p class="offline" role="status">
                ${msg('Connect to the internet to sign in.', { id: 'dialogs.signin.offline' })}
              </p>`
        }
        ${
          signInAvailable
            ? html`
                <div>
                  ${illustration(signInArt)}
                  ${
                    emailLinkSignIn
                      ? html`<email-link-form class="email-link"></email-link-form>`
                      : nothing
                  }
                  ${
                    emailLinkSignIn && this.signInProviders.providersData.length
                      ? html`<p class="or">
                          ${msg('or', {
                            id: 'dialogs.signin.or',
                            desc: 'Between signing in by email and signing in with another account.',
                          })}
                        </p>`
                      : nothing
                  }
                  ${this.signInProviders.providersData.map(
                    (provider) => html`
                      <hb-button
                        variant="text"
                        class="sign-in-button"
                        ?disabled="${!this.online}"
                        @click="${() => this.signIn(provider.url as PROVIDER)}"
                      >
                        <node-icon
                          slot="icon"
                          name="${provider.name}"
                          class="icon-${provider.name}"
                        ></node-icon>
                        ${signInWith(provider.label)}
                      </hb-button>
                    `,
                  )}
                </div>
              `
            : html`<p class="unavailable" role="status">
                ${msg('Sign-in is not available on this site yet.', {
                  id: 'dialogs.signin.unavailable',
                })}
              </p>`
        }
      </hb-dialog>
    `;
  }

  private signIn(providerUrl: PROVIDER) {
    void signIn(providerUrl);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'signin-dialog': SigninDialog;
  }
}
