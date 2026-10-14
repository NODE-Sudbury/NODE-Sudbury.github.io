import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { html } from 'lit';
import { fixture } from '../../../__tests__/helpers/fixtures';
import { signInWithGoogleToken } from '../../store/auth';
import { openSigninDialog } from '../../store/dialogs';
import { renderGoogleButton } from '../../utils/google-identity';
import type { SigninDialog } from './signin-dialog';
import './signin-dialog';

vi.mock('../../supabase', () => ({ isSupabaseConfigured: true, getSupabase: vi.fn() }));

vi.mock('../../utils/google-identity', () => ({
  googleClientId: 'client-123.apps.googleusercontent.com',
  renderGoogleButton: vi.fn(),
}));

vi.mock('../../store/auth', async (importOriginal) => ({
  __esModule: true,
  ...(await importOriginal<typeof import('../../store/auth')>()),
  sendSignInLink: vi.fn(),
  signIn: vi.fn(),
  signInWithGoogleToken: vi.fn(),
}));

describe('signin-dialog with Google sign-in set up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderGoogleButton).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Google's own button, and signs in with the token it gives", async () => {
    openSigninDialog();
    const { element, shadowRoot } = await fixture<SigninDialog>(
      html`<signin-dialog></signin-dialog>`,
    );
    await element.updateComplete;

    const container = shadowRoot.querySelector('.google-button');
    expect(container).not.toBeNull();
    expect(shadowRoot.querySelector('.sign-in-button')).toBeNull();
    expect(renderGoogleButton).toHaveBeenCalledWith(container, expect.any(Function));

    vi.mocked(renderGoogleButton).mock.calls[0]![1]('signed-token', 'raw-nonce');
    expect(signInWithGoogleToken).toHaveBeenCalledWith('signed-token', 'raw-nonce');
  });

  it('falls back to the sign-in by redirect when the button cannot be shown', async () => {
    vi.mocked(renderGoogleButton).mockRejectedValue(new Error('blocked'));
    openSigninDialog();
    const { element, shadowRoot } = await fixture<SigninDialog>(
      html`<signin-dialog></signin-dialog>`,
    );
    await element.updateComplete;
    await vi.waitFor(() => expect(shadowRoot.querySelector('.sign-in-button')).not.toBeNull());

    expect(shadowRoot.querySelector('.google-button')).toBeNull();
  });
});
