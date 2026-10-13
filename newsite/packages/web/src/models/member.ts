import type { Social } from './social';
import type { ParentId } from './types';

export interface MemberData {
  name: string;
  order: number;
  photo: string;
  photoUrl: string;
  socials: Social[];
  title: string;
  /** About the member, as markdown. Without it the page says who they are. */
  bio?: string;
}

export type Member = ParentId & MemberData;
