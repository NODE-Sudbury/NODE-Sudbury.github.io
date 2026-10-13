import { Failure, Initialized, Pending, type RemoteData, Success } from '@abraham/remotedata';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '..';
import { getSupabase, isSupabaseConfigured } from '../../supabase';
import { logLogin } from '../../utils/analytics';
import { PROVIDER, supabaseProvider } from '../../utils/providers';
import { dispatch } from '../dispatch';
import { resetFeaturedSessions } from '../featured-sessions';
import { resetProfiles } from '../profiles';
import { resetReactions } from '../reactions';
import { resetPending } from '../sync';
import { unsubscribeFromFeedback } from '../feedback';
import { resetSubscribed } from '../subscribe';
import { removeUser, setUser } from '../user';

export type AuthFailure = { message: string };

export type AuthState = RemoteData<AuthFailure, true>;

export const initialAuthState: AuthState = new Initialized();
const initialState = initialAuthState;

const slice = createSlice({
  name: 'auth',
  initialState: initialState as AuthState,
  reducers: {
    pending: (): AuthState => new Pending(),
    success: (): AuthState => new Success(true),
    failure: (_state, action: PayloadAction<AuthFailure>): AuthState => new Failure(action.payload),
    unAuth: (): AuthState => new Initialized(),
  },
});

const { pending, success, failure, unAuth } = slice.actions;

export const selectAuthFailure = (state: RootState): AuthFailure | undefined =>
  state.auth instanceof Failure ? state.auth.error : undefined;

/** Whether this build can sign people in. Without Supabase keys it cannot. */
export const signInAvailable = isSupabaseConfigured;

/** Where Supabase sends the member back to: this page, without a leftover code or hash. */
const returnUrl = (): string => {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  return url.toString();
};

/** Signs in through an identity provider, such as Google. The browser leaves for it and returns signed in. */
export const signIn = async (providerId: PROVIDER) => {
  dispatch(pending());
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: supabaseProvider(providerId),
    options: { redirectTo: returnUrl() },
  });
  if (error) dispatch(failure({ message: error.message }));
};

/**
 * Emails a link that signs the member in when they open it, with no password. Someone new gets an
 * account, and the database adds their row to the members table.
 */
export const sendSignInLink = async (email: string) => {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: returnUrl(), shouldCreateUser: true },
  });
  if (error) throw error;
};

/** Follows the signed-in state: the member in the header, and what to forget on sign-out. */
export const onUser = () => {
  if (!isSupabaseConfigured) return;
  getSupabase().auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      setUser(session.user);
      dispatch(success());
      if (event === 'SIGNED_IN') logLogin();
    } else {
      dispatch(unAuth());
      removeUser();
      resetSubscribed();
      dispatch(unsubscribeFromFeedback());
      resetFeaturedSessions();
      resetReactions();
      resetProfiles();
      resetPending();
    }
  });
};

/** Signs out. The state listener clears the member from the page. */
export const signOut = async () => {
  await getSupabase().auth.signOut();
};

export default slice.reducer;
