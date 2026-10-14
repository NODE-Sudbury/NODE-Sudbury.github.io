import { msg } from '@lit/localize';
import { css, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import '../components/hero/hero-block';
import { heroText } from '../components/hero/hero-block';
import { PAGE_TONES } from '../components/hero/simple-hero';
import '../components/shared/node-icon';
import '../components/ui/hb-button';
import '../components/ui/hb-text-field';
import type { HbTextField } from '../components/ui/hb-text-field';
import { ThemedComponent } from '../components/themed-component';
import { unsubscribeEmail } from '../db/subscribers';
import { profile as profileStyles } from '../styles/profile';
import { updateTextMetadata } from '../utils/metadata';

type Status = 'idle' | 'sending' | 'done' | 'failed';

/** Where anyone can take their email off the NODE updates list, without signing in. */
@customElement('unsubscribe-page')
export class UnsubscribePage extends ThemedComponent {
  static override styles = [
    heroText,
    profileStyles,
    css`
      :host {
        display: block;
        background-color: var(--hb-section-background);
        color: var(--hb-color-on-surface);
      }

      .form {
        display: grid;
        gap: var(--hb-space-4);
        max-inline-size: 28rem;
      }

      .done {
        display: flex;
        align-items: flex-start;
        gap: var(--hb-space-3);
        max-inline-size: 36rem;
        margin: 0;
      }

      .done node-icon {
        flex: none;
        inline-size: 28px;
        block-size: 28px;
      }

      .note {
        margin: 0;
        color: var(--hb-color-on-surface-variant);
        font-size: var(--hb-text-sm);
      }
    `,
  ];

  @state()
  private accessor email = '';
  @state()
  private accessor status: Status = 'idle';

  @query('hb-text-field')
  private accessor field!: HbTextField | null;

  override firstUpdated() {
    updateTextMetadata(
      msg('Unsubscribe', { id: 'pages.unsubscribe.title' }),
      msg('Stop getting updates from NODE by email.', { id: 'pages.unsubscribe.description' }),
    );
    // A link in an email can carry the address, so the person only has to confirm.
    this.email = new URLSearchParams(window.location.search).get('email') ?? '';
  }

  override render() {
    return html`
      <hero-block tone="${PAGE_TONES.team}">
        <h1 class="hero-title">${msg('Unsubscribe', { id: 'pages.unsubscribe.title' })}</h1>
        <p class="hero-description">
          ${msg('Stop getting updates from NODE by email.', {
            id: 'pages.unsubscribe.lede',
          })}
        </p>
      </hero-block>

      <div class="inner">${this.status === 'done' ? this.renderDone() : this.renderForm()}</div>
    `;
  }

  private renderDone() {
    return html`<p class="done" role="status">
      <node-icon name="checked"></node-icon>
      <span>
        ${msg(
          'If that email was on our list, it has been removed. You can subscribe again any time from the home page.',
          { id: 'pages.unsubscribe.done' },
        )}
      </span>
    </p>`;
  }

  private renderForm() {
    return html`<div class="form">
      <hb-text-field
        type="email"
        name="email"
        autocomplete="email"
        required
        label="${msg('Your email', { id: 'home.subscribe-block.email' })}"
        .value="${this.email}"
        error="${
          this.status === 'failed'
            ? msg('Could not unsubscribe. Please try again.', { id: 'pages.unsubscribe.error' })
            : ''
        }"
        ?disabled="${this.status === 'sending'}"
        @input="${this.onInput}"
        @keydown="${this.onKeydown}"
      ></hb-text-field>
      <div>
        <hb-button ?disabled="${this.status === 'sending'}" @click="${this.submit}">
          ${
            this.status === 'sending'
              ? msg('Unsubscribing...', { id: 'pages.unsubscribe.sending' })
              : msg('Unsubscribe', { id: 'pages.unsubscribe.button' })
          }
        </hb-button>
      </div>
      <p class="note">
        ${msg('Use the same email you subscribed with.', { id: 'pages.unsubscribe.note' })}
      </p>
    </div>`;
  }

  private readonly onInput = (event: Event) => {
    this.email = (event.target as HbTextField).value;
    if (this.status === 'failed') this.status = 'idle';
  };

  // The field's input is in its own shadow root, with no form to submit on Enter.
  private readonly onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.submit();
    }
  };

  private readonly submit = async () => {
    if (this.status === 'sending' || !this.field?.reportValidity()) return;
    this.status = 'sending';
    try {
      await unsubscribeEmail(this.email.trim());
      this.status = 'done';
    } catch {
      this.status = 'failed';
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'unsubscribe-page': UnsubscribePage;
  }
}
