import type { MemberProfile } from './member-profile';

/** A member as the admin dashboard lists them: their profile, email and whether they are active. */
export interface AdminMember extends Pick<
  MemberProfile,
  | 'id'
  | 'createdAt'
  | 'isExclusiveMember'
  | 'handle'
  | 'fullName'
  | 'avatarUrl'
  | 'memberType'
  | 'jobTitle'
  | 'company'
  | 'school'
  | 'program'
  | 'isPublic'
> {
  email: string;
  isActive: boolean;
}
