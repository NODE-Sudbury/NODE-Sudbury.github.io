export type MemberType = 'professional' | 'student';

/** What a member can say about themselves. All of it is optional except their type. */
export interface MemberProfile {
  /** The member's account id. Old `/profile/<id>` links use it. */
  id: string;
  /** When they joined, for "Member since". An ISO date. */
  createdAt: string;
  /** Exclusive membership, which only the board can grant. */
  isExclusiveMember: boolean;
  /** The short name in their public address, `/members/<handle>`. */
  handle: string;
  fullName: string;
  avatarUrl: string;
  memberType: MemberType;
  jobTitle: string;
  company: string;
  school: string;
  program: string;
  bio: string;
  pronouns: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
  websiteUrl: string;
  /** Not a link, so it only shows on the member's own page. */
  discordTag: string;
  /** Whether the page at their address is visible to everyone. */
  isPublic: boolean;
}

/** What anyone sees on a public profile: no Discord tag, and no visibility setting. */
export type PublicProfile = Omit<MemberProfile, 'discordTag' | 'isPublic'>;
