/**
 * Google's own sign-in button, from Google Identity Services. Signing in with it happens on our page
 * and Google names the site (nodesudbury.com) on its account chooser, where signing in through
 * Supabase's redirect names the address of the Supabase project instead.
 *
 * The button gives back a signed token for the person. The browser hands it to Supabase together
 * with a nonce that only it knows, so a token that was copied from somewhere else is refused.
 */

const SCRIPT = 'https://accounts.google.com/gsi/client';

/** Google's public client id for the site. Without it, sign-in goes through the redirect. */
export const googleClientId = import.meta.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] as string | undefined;

interface GoogleCredential {
  credential: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredential) => void;
        nonce: string;
        use_fedcm_for_button?: boolean;
      }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const toHex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** A nonce for one sign-in: the raw value for Supabase, and its SHA-256 for Google. */
export const makeNonce = async (): Promise<{ raw: string; hashed: string }> => {
  const raw = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return { raw, hashed: toHex(new Uint8Array(digest)) };
};

let loading: Promise<GoogleIdentity> | undefined;

/** Loads Google's script once. It fails when the script is blocked or the browser is offline. */
export const loadGoogleIdentity = (): Promise<GoogleIdentity> => {
  if (window.google) return Promise.resolve(window.google);
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () =>
      window.google ? resolve(window.google) : reject(new Error('Google sign-in did not start.'));
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Google sign-in could not load.'));
    };
    document.head.append(script);
  });
  return loading;
};

/**
 * Puts Google's button in `parent`. `onToken` gets the signed token and the raw nonce when the
 * person picks an account. Rejects when the button cannot be shown, so the caller can fall back.
 */
export const renderGoogleButton = async (
  parent: HTMLElement,
  onToken: (token: string, nonce: string) => void,
): Promise<void> => {
  if (!googleClientId) throw new Error('Google sign-in is not set up for this build.');
  const google = await loadGoogleIdentity();
  const nonce = await makeNonce();
  google.accounts.id.initialize({
    client_id: googleClientId,
    callback: ({ credential }) => onToken(credential, nonce.raw),
    nonce: nonce.hashed,
    use_fedcm_for_button: true,
  });
  google.accounts.id.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width: 320,
  });
};
