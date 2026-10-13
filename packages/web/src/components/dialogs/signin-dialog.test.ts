import { Success } from '@abraham/remotedata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { html } from 'lit';
import { fixture } from '../../../__tests__/helpers/fixtures';
import { setStoreState } from '../../../__tests__/helpers/store';
import { signIn } from '../../store/auth';
import { closeDialog, openSigninDialog } from '../../store/dialogs';
import { signInProviders } from '../../config/site';
import type { User } from '../../models/user';
import type { PROVIDER } from '../../utils/providers';
import type { EmailLinkForm } from './email-link-form';
import type { SigninDialog } from './signin-dialog';
import './signin-dialog';

vi.mock('../../supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: vi.fn(),
}));

vi.mock('../../store/auth', async (importOriginal) => ({
  __esModule: true,
  ...(await importOriginal<typeof import('../../store/auth')>()),
  sendSignInLink: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock('../../store/dialogs', async (importOriginal) => ({
  __esModule: true,
  ...(await importOriginal<typeof import('../../store/dialogs')>()),
  closeDialog: vi.fn(),
}));

const mockSignIn = vi.mocked(signIn);
const mockCloseDialog = vi.mocked(closeDialog);

describe('signin-dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('defines a component', () => {
    expect(customElements.get('signin-dialog')).toBeDefined();
  });

  it('renders a button for each sign-in provider', async () => {
    const { shadowRoot } = await fixture<SigninDialog>(html`<signin-dialog></signin-dialog>`);

    expect(shadowRoot.querySelector('hb-dialog')).toHaveAttribute('heading', 'Sign in');
    const buttons = shadowRoot.querySelectorAll('.sign-in-button');
    expect(buttons).toHaveLength(signInProviders.providersData.length);
    expect(buttons[0]).toHaveTextContent(`Sign in with ${signInProviders.providersData[0]!.label}`);
    expect(shadowRoot.querySelector('.illustration')).toHaveAttribute('aria-hidden', 'true');
  });

  it('signs in with the clicked provider', async () => {
    const { shadowRoot } = await fixture<SigninDialog>(html`<signin-dialog></signin-dialog>`);

    shadowRoot.querySelector<HTMLElement>('.sign-in-button')!.click();

    expect(mockSignIn).toHaveBeenCalledWith(signInProviders.providersData[0]!.url as PROVIDER);
  });

  it('needs the internet to sign in', async () => {
    const { element, shadowRoot } = await fixture<SigninDialog>(
      html`<signin-dialog></signin-dialog>`,
    );
    element['online'] = false;
    await element.updateComplete;

    expect(shadowRoot.querySelector('.offline')).toHaveTextContent(
      'Connect to the internet to sign in.',
    );
    for (const button of shadowRoot.querySelectorAll('.sign-in-button')) {
      expect(button).toHaveAttribute('disabled');
    }
  });

  it('dispatches closeDialog when the dialog is closed', async () => {
    const { shadowRoot } = await fixture<SigninDialog>(html`<signin-dialog></signin-dialog>`);

    shadowRoot.querySelector('hb-dialog')!.dispatchEvent(new Event('close'));

    expect(mockCloseDialog).toHaveBeenCalled();
  });

  it('signs in by email above the other ways to sign in', async () => {
    const { shadowRoot } = await fixture<SigninDialog>(html`<signin-dialog></signin-dialog>`);

    expect(shadowRoot.querySelector('email-link-form.email-link + .or')).toHaveTextContent('or');
  });

  it('starts the email form again each time it opens', async () => {
    const { element, shadowRoot } = await fixture<SigninDialog>(
      html`<signin-dialog></signin-dialog>`,
    );
    const reset = vi.spyOn(shadowRoot.querySelector<EmailLinkForm>('email-link-form')!, 'reset');

    element['open'] = true;
    await element.updateComplete;

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('closes when a member signs in', async () => {
    const { element } = await fixture<SigninDialog>(html`<signin-dialog></signin-dialog>`);
    openSigninDialog();
    await element.updateComplete;

    setStoreState({ user: new Success({ uid: 'user-1' } as User) });

    expect(mockCloseDialog).toHaveBeenCalled();
  });
});
