import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSubscriber } from './subscribers';

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));

vi.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({ from }),
}));

const subscriber = {
  email: ' ada.lovelace+subscribe@example.com ',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

describe('db/subscribers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds the subscriber to the subscribers table', async () => {
    insert.mockResolvedValue({ error: null });
    const onRejected = vi.fn();

    saveSubscriber(subscriber, onRejected);

    expect(from).toHaveBeenCalledWith('subscribers');
    expect(insert).toHaveBeenCalledWith({
      email: 'ada.lovelace+subscribe@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
    });
    await vi.waitFor(() => expect(insert).toHaveBeenCalled());
    expect(onRejected).not.toHaveBeenCalled();
  });

  it('counts an email that is already subscribed as subscribed', async () => {
    insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    const onRejected = vi.fn();

    saveSubscriber(subscriber, onRejected);
    await new Promise((resolve) => setTimeout(resolve));

    expect(onRejected).not.toHaveBeenCalled();
  });

  it('reports any other failure', async () => {
    insert.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    const onRejected = vi.fn();

    saveSubscriber(subscriber, onRejected);

    await vi.waitFor(() => expect(onRejected).toHaveBeenCalledWith(new Error('permission denied')));
  });
});
