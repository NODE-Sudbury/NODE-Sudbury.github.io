import type { Subscriber } from '../models/subscriber';
import { getSupabase, isSupabaseConfigured } from '../supabase';

/** Postgres' error for an email that is already in the table. */
const UNIQUE_VIOLATION = '23505';

/**
 * Adds an email to the subscribers table. An email that is already there counts as subscribed, so
 * the visitor is thanked and the list is not told who is on it. A failure goes to `onRejected`.
 */
export const saveSubscriber = (
  subscriber: Subscriber,
  onRejected: (error: Error) => void,
): void => {
  if (!isSupabaseConfigured) {
    onRejected(new Error('Subscribing is not set up for this site.'));
    return;
  }
  void getSupabase()
    .from('subscribers')
    .insert({
      email: subscriber.email.trim(),
      first_name: subscriber.firstName,
      last_name: subscriber.lastName,
    })
    .then(({ error }) => {
      if (error && error.code !== UNIQUE_VIOLATION) onRejected(new Error(error.message));
    });
};
