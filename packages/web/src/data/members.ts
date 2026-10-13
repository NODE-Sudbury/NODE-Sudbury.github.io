import type { Member } from '../models/member';
import type { Team } from '../models/team';
import { isPlaceholderMember } from '../utils/members';

/**
 * The people who get a page of their own: every member of the board, the first team by title,
 * except places still held for people to be announced.
 */
export const boardMembers = (
  teams: Pick<Team, 'id' | 'title'>[] = [],
  members: Member[] = [],
): Member[] => {
  const [board] = [...teams].sort((a, b) => a.title.localeCompare(b.title));
  return members
    .filter((member) => member.parentId === board?.id && !isPlaceholderMember(member))
    .sort((a, b) => a.order - b.order);
};
