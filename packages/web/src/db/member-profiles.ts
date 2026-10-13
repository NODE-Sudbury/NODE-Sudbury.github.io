import type { MemberProfile, MemberType, PublicProfile } from '../models/member-profile';
import { getSupabase } from '../supabase';

type Row = Record<string, string | boolean | null>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const OWN_COLUMNS =
  'handle, full_name, avatar_url, member_type, job_title, company, school, program, bio, pronouns, linkedin_url, github_url, twitter_url, website_url, discord_tag, is_public';

const PUBLIC_COLUMNS =
  'handle, full_name, avatar_url, member_type, job_title, company, school, program, bio, pronouns, linkedin_url, github_url, twitter_url, website_url';

const toPublic = (row: Row): PublicProfile => ({
  handle: text(row['handle']),
  fullName: text(row['full_name']),
  avatarUrl: text(row['avatar_url']),
  memberType: row['member_type'] === 'student' ? 'student' : 'professional',
  jobTitle: text(row['job_title']),
  company: text(row['company']),
  school: text(row['school']),
  program: text(row['program']),
  bio: text(row['bio']),
  pronouns: text(row['pronouns']),
  linkedinUrl: text(row['linkedin_url']),
  githubUrl: text(row['github_url']),
  twitterUrl: text(row['twitter_url']),
  websiteUrl: text(row['website_url']),
});

const toOwn = (row: Row): MemberProfile => ({
  ...toPublic(row),
  discordTag: text(row['discord_tag']),
  isPublic: row['is_public'] !== false,
});

const empty = (value: string): string | null => value.trim() || null;

/** The columns of the members table for a profile. A blank box saves as nothing. */
const toRow = (profile: MemberProfile) => ({
  handle: empty(profile.handle),
  full_name: empty(profile.fullName),
  member_type: profile.memberType satisfies MemberType,
  job_title: empty(profile.jobTitle),
  company: empty(profile.company),
  school: empty(profile.school),
  program: empty(profile.program),
  bio: empty(profile.bio),
  pronouns: empty(profile.pronouns),
  linkedin_url: empty(profile.linkedinUrl),
  github_url: empty(profile.githubUrl),
  twitter_url: empty(profile.twitterUrl),
  website_url: empty(profile.websiteUrl),
  discord_tag: empty(profile.discordTag),
  is_public: profile.isPublic,
});

/** Someone else has taken the handle. */
export class HandleTakenError extends Error {
  constructor() {
    super('That handle is taken.');
  }
}

/** The signed-in member's own profile. They can always read their own row. */
export const fetchOwnProfile = async (uid: string): Promise<MemberProfile | undefined> => {
  const { data, error } = await getSupabase()
    .from('members')
    .select(OWN_COLUMNS)
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  return data ? toOwn(data as Row) : undefined;
};

/** Saves the signed-in member's profile. The database only lets them change their own row. */
export const saveOwnProfile = async (uid: string, profile: MemberProfile): Promise<void> => {
  const { error } = await getSupabase().from('members').update(toRow(profile)).eq('id', uid);
  // 23505 is a unique violation: another member already has the handle.
  if (error?.code === '23505') throw new HandleTakenError();
  if (error) throw error;
};

/**
 * A public profile by its handle, from a view that never has the email or the role. Gone when the
 * member made it private or has no such handle.
 */
export const fetchPublicProfile = async (handle: string): Promise<PublicProfile | undefined> => {
  const { data, error } = await getSupabase()
    .from('public_profiles')
    .select(PUBLIC_COLUMNS)
    .eq('handle', handle)
    .maybeSingle();
  if (error) throw error;
  return data ? toPublic(data as Row) : undefined;
};
