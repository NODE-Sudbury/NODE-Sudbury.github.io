import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDiscordMemberCount, memberCountLabel } from './discord';

const answer = (body: unknown, ok = true) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok, json: async () => body } as Response);

describe('fetchDiscordMemberCount', () => {
  afterEach(() => vi.restoreAllMocks());

  it('asks Discord for the invite with its counts', async () => {
    const fetch = answer({ approximate_member_count: 30 });

    await expect(fetchDiscordMemberCount('abc')).resolves.toBe(30);
    expect(fetch).toHaveBeenCalledWith('https://discord.com/api/v10/invites/abc?with_counts=true');
  });

  it('gives nothing when Discord says no, sends nonsense or cannot be reached', async () => {
    answer({}, false);
    await expect(fetchDiscordMemberCount()).resolves.toBeUndefined();

    answer({ approximate_member_count: 'many' });
    await expect(fetchDiscordMemberCount()).resolves.toBeUndefined();

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(fetchDiscordMemberCount()).resolves.toBeUndefined();
  });
});

describe('memberCountLabel', () => {
  it('rounds down to one less, with a plus', () => {
    expect(memberCountLabel(30)).toBe('29+');
    expect(memberCountLabel(0)).toBe('0+');
  });
});
