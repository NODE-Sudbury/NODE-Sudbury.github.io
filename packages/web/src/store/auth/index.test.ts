import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { logLogin } from '../../utils/analytics';
import { PROVIDER } from '../../utils/providers';
import { dispatch } from '../dispatch';
import { resetFeaturedSessions } from '../featured-sessions';
import { resetProfiles } from '../profiles';
import { resetReactions } from '../reactions';
import { unsubscribeFromFeedback } from '../feedback';
import { resetSubscribed } from '../subscribe';
import { removeUser, setUser } from '../user';
import reducer, {
  initialAuthState,
  onUser,
  selectAuthFailure,
  sendSignInLink,
  signIn,
  signInWithGoogleToken,
  signOut,
} from '.';
import type { RootState } from '..';
import { Failure, Initialized, Pending, Success } from '@abraham/remotedata';

vi.mock('../dispatch');
vi.mock('../../utils/analytics', () => ({ logLogin: vi.fn() }));
vi.mock('../featured-sessions', () => ({ resetFeaturedSessions: vi.fn() }));
vi.mock('../profiles', () => ({ resetProfiles: vi.fn() }));
vi.mock('../reactions', () => ({ resetReactions: vi.fn() }));
vi.mock('../feedback', () => ({
  unsubscribeFromFeedback: vi.fn(() => ({ type: 'feedback/unsubscribeFromFeedback' })),
}));
vi.mock('../subscribe', () => ({ resetSubscribed: vi.fn() }));
vi.mock('../user', () => ({ removeUser: vi.fn(), setUser: vi.fn() }));

const auth = {
  signInWithOAuth: vi.fn(),
  signInWithIdToken: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
};
vi.mock('../../supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ auth }),
}));

const actionTypes = () =>
  vi.mocked(dispatch).mock.calls.map(([action]) => (action as { type: string }).type);

describe('auth reducer', () => {
  it('starts without a sign-in under way', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toStrictEqual(initialAuthState);
  });

  it('moves through pending, success and failure', () => {
    expect(reducer(new Initialized(), { type: 'auth/pending' })).toStrictEqual(new Pending());
    expect(reducer(new Pending(), { type: 'auth/success' })).toStrictEqual(new Success(true));
    expect(
      reducer(new Pending(), { type: 'auth/failure', payload: { message: 'No' } }),
    ).toStrictEqual(new Failure({ message: 'No' }));
    expect(reducer(new Success(true), { type: 'auth/unAuth' })).toStrictEqual(new Initialized());
  });
});

describe('selectAuthFailure', () => {
  it('returns the failure, if any', () => {
    expect(selectAuthFailure({ auth: new Failure({ message: 'No' }) } as RootState)).toStrictEqual({
      message: 'No',
    });
    expect(selectAuthFailure({ auth: new Initialized() } as RootState)).toBeUndefined();
  });
});

describe('signInWithGoogleToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gives Supabase Google's token with the raw nonce", async () => {
    auth.signInWithIdToken.mockResolvedValueOnce({ error: null });

    await signInWithGoogleToken('signed-token', 'raw-nonce');

    expect(auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'signed-token',
      nonce: 'raw-nonce',
    });
    expect(actionTypes()).toEqual(['auth/pending']);
  });

  it('records why the sign-in failed', async () => {
    auth.signInWithIdToken.mockResolvedValueOnce({ error: { message: 'Nonce mismatch' } });

    await signInWithGoogleToken('signed-token', 'wrong');

    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'auth/failure',
      payload: { message: 'Nonce mismatch' },
    });
  });
});

describe('signIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the visitor to Google and back to this page', async () => {
    auth.signInWithOAuth.mockResolvedValueOnce({ error: null });

    await signIn(PROVIDER['https://accounts.google.com']);

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    expect(actionTypes()).toEqual(['auth/pending']);
  });

  it('records why the sign-in failed', async () => {
    auth.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'Provider is disabled' } });

    await signIn(PROVIDER['google.com']);

    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'auth/failure',
      payload: { message: 'Provider is disabled' },
    });
  });
});

describe('sendSignInLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks Supabase to email a link that comes back to this page', async () => {
    auth.signInWithOtp.mockResolvedValueOnce({ error: null });

    await sendSignInLink('ada@example.com');

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        shouldCreateUser: true,
      },
    });
  });

  it('throws when the link could not be sent', async () => {
    auth.signInWithOtp.mockResolvedValueOnce({ error: new Error('Rate limited') });

    await expect(sendSignInLink('ada@example.com')).rejects.toThrow('Rate limited');
  });
});

describe('onUser', () => {
  let listener: (event: string, session: Session | null) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    auth.onAuthStateChange.mockImplementation((callback) => {
      listener = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    onUser();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('stores the member and logs a new sign-in', () => {
    const user = { id: 'user-1' };

    listener('SIGNED_IN', { user } as unknown as Session);

    expect(setUser).toHaveBeenCalledWith(user);
    expect(actionTypes()).toEqual(['auth/success']);
    expect(logLogin).toHaveBeenCalled();
  });

  it('does not log a sign-in again when a returning member is restored', () => {
    listener('INITIAL_SESSION', { user: { id: 'user-1' } } as unknown as Session);

    expect(setUser).toHaveBeenCalled();
    expect(logLogin).not.toHaveBeenCalled();
  });

  it('forgets everything about the member when there is no session', () => {
    listener('SIGNED_OUT', null);

    expect(actionTypes()).toContain('auth/unAuth');
    expect(removeUser).toHaveBeenCalled();
    expect(resetSubscribed).toHaveBeenCalled();
    expect(unsubscribeFromFeedback).toHaveBeenCalled();
    expect(resetFeaturedSessions).toHaveBeenCalled();
    expect(resetReactions).toHaveBeenCalled();
    expect(resetProfiles).toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('signs out of Supabase', async () => {
    auth.signOut.mockResolvedValueOnce({ error: null });

    await signOut();

    expect(auth.signOut).toHaveBeenCalled();
  });
});
