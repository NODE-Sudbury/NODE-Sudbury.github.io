import type { Subscriber } from '../models/subscriber';
import { getSupabase, isSupabaseConfigured } from '../supabase';

/**
 * Adds an email to the subscribers table, or turns it back on if it had unsubscribed. An email
 * that is already subscribed is no different, so the visitor is thanked and the list is not told
 * who is on it. A failure goes to `onRejected`.
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
    .rpc('subscribe_email', {
      p_email: subscriber.email,
      p_first_name: subscriber.firstName,
      p_last_name: subscriber.lastName,
    })
    .then(({ error }) => {
      if (error) onRejected(new Error(error.message));
    });
};

/**
 * Takes an email off the list. It does not say whether the email was on it, so nobody can use it
 * to find out who is. Throws when the request itself fails.
 */
export const unsubscribeEmail = async (email: string): Promise<void> => {
  if (!isSupabaseConfigured) throw new Error('Unsubscribing is not set up for this site.');
  const { error } = await getSupabase().rpc('unsubscribe_email', { candidate: email });
  if (error) throw new Error(error.message);
};
