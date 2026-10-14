import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const load = async (clientId?: string) => {
  vi.resetModules();
  if (clientId) vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', clientId);
  return import('./google-identity');
};

describe('google-identity', () => {
  beforeEach(() => {
    delete window.google;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.querySelectorAll('script').forEach((script) => script.remove());
  });

  it('makes a nonce, and gives Google only its SHA-256', async () => {
    const { makeNonce } = await load();

    const { raw, hashed } = await makeNonce();

    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).toBe(createHash('sha256').update(raw).digest('hex'));
    expect((await makeNonce()).raw).not.toBe(raw);
  });

  it('is off without a client id', async () => {
    const { googleClientId, renderGoogleButton } = await load();

    expect(googleClientId).toBeUndefined();
    await expect(renderGoogleButton(document.createElement('div'), vi.fn())).rejects.toThrow(
      'not set up',
    );
  });

  it('shows the button, and passes the token with the raw nonce back', async () => {
    const { renderGoogleButton } = await load('client-123.apps.googleusercontent.com');
    const initialize = vi.fn();
    const renderButton = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton } } };
    const onToken = vi.fn();
    const parent = document.createElement('div');

    await renderGoogleButton(parent, onToken);

    const options = initialize.mock.calls[0]![0];
    expect(options.client_id).toBe('client-123.apps.googleusercontent.com');
    expect(renderButton).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({ type: 'standard' }),
    );
    options.callback({ credential: 'signed-token' });
    const [token, nonce] = onToken.mock.calls[0] as [string, string];
    expect(token).toBe('signed-token');
    expect(createHash('sha256').update(nonce).digest('hex')).toBe(options.nonce);
  });

  it('rejects, so the page can fall back, when the script cannot load', async () => {
    const { renderGoogleButton } = await load('client-123.apps.googleusercontent.com');

    const shown = renderGoogleButton(document.createElement('div'), vi.fn());
    document.head.querySelector('script')!.dispatchEvent(new Event('error'));

    await expect(shown).rejects.toThrow('could not load');
  });
});
