/** The permanent invite to the NODE Discord server. */
export const DISCORD_INVITE_CODE = 'MtBcHMbkgB';
export const DISCORD_URL = `https://discord.gg/${DISCORD_INVITE_CODE}`;

/**
 * How many people are in the server, which Discord says for any invite without a login. It is
 * approximate, and undefined when Discord can't be reached or the answer is not a number.
 */
export const fetchDiscordMemberCount = async (
  code: string = DISCORD_INVITE_CODE,
): Promise<number | undefined> => {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`,
    );
    if (!response.ok) return undefined;
    const { approximate_member_count: count } = (await response.json()) as {
      approximate_member_count?: unknown;
    };
    return typeof count === 'number' && Number.isFinite(count) ? count : undefined;
  } catch {
    return undefined;
  }
};

/** The count as a floor, such as 29+ for 30 members, so it never claims more than it has. */
export const memberCountLabel = (count: number): string => `${Math.max(count - 1, 0)}+`;
