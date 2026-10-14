import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSubscriber, unsubscribeEmail } from './subscribers';

const rpc = vi.fn();

vi.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ rpc }),
}));

const subscriber = {
  email: 'ada.lovelace+subscribe@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

describe('db/subscribers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes the email, which also turns back on one that had unsubscribed', async () => {
    rpc.mockResolvedValue({ error: null });
    const onRejected = vi.fn();

    saveSubscriber(subscriber, onRejected);

    expect(rpc).toHaveBeenCalledWith('subscribe_email', {
      p_email: 'ada.lovelace+subscribe@example.com',
      p_first_name: 'Ada',
      p_last_name: 'Lovelace',
    });
    await new Promise((resolve) => setTimeout(resolve));
    expect(onRejected).not.toHaveBeenCalled();
  });

  it('reports a failure to subscribe', async () => {
    rpc.mockResolvedValue({ error: { message: 'permission denied' } });
    const onRejected = vi.fn();

    saveSubscriber(subscriber, onRejected);

    await vi.waitFor(() => expect(onRejected).toHaveBeenCalledWith(new Error('permission denied')));
  });

  it('unsubscribes an email', async () => {
    rpc.mockResolvedValue({ error: null });

    await unsubscribeEmail('ada@example.com');

    expect(rpc).toHaveBeenCalledWith('unsubscribe_email', { candidate: 'ada@example.com' });
  });

  it('throws when unsubscribing fails', async () => {
    rpc.mockResolvedValue({ error: { message: 'network' } });

    await expect(unsubscribeEmail('ada@example.com')).rejects.toThrow('network');
  });
});
