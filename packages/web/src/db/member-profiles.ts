import type { MemberProfile, MemberType, PublicProfile } from '../models/member-profile';
import { getSupabase } from '../supabase';

type Row = Record<string, string | boolean | null>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const OWN_COLUMNS =
  'id, created_at, is_exclusive_member, handle, full_name, avatar_url, member_type, job_title, company, school, program, bio, pronouns, linkedin_url, github_url, twitter_url, website_url, discord_tag, is_public';

const toPublic = (row: Row): PublicProfile => ({
  id: text(row['id']),
  createdAt: text(row['created_at']),
  isExclusiveMember: row['is_exclusive_member'] === true,
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

/** How to find a public profile: by the handle in its address, or by the id older links use. */
export type ProfileKey = { handle: string } | { id: string };

/**
 * A public profile, which never has the email or the role. The database hands over one profile at
 * a time, by its handle or id, so the list of members cannot be pulled out in one request. Gone
 * when the member made it private or there is no such member.
 */
export const fetchPublicProfile = async (key: ProfileKey): Promise<PublicProfile | undefined> => {
  const { data, error } = await getSupabase()
    .rpc('get_public_profile', 'handle' in key ? { p_handle: key.handle } : { p_id: key.id })
    .maybeSingle();
  if (error) throw error;
  return data ? toPublic(data as Row) : undefined;
};

/** The photo's largest size on disk, as the old site allowed. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Saves a photo for the signed-in member in the public `avatars` bucket, in their own folder
 * (the bucket only lets a member write there), and makes it their profile photo. Returns its
 * address. The address changes each time, so browsers do not show the old photo.
 */
export const uploadAvatar = async (uid: string, photo: Blob): Promise<string> => {
  const supabase = getSupabase();
  const path = `${uid}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, photo, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
  if (error) throw error;
  const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const { error: saveError } = await supabase
    .from('members')
    .update({ avatar_url: url })
    .eq('id', uid);
  if (saveError) throw saveError;
  return url;
};

/** Takes the profile photo off the member's profile. Their uploaded file stays in storage. */
export const removeAvatar = async (uid: string): Promise<void> => {
  const { error } = await getSupabase().from('members').update({ avatar_url: null }).eq('id', uid);
  if (error) throw error;
};

/**
 * Whether a handle is free for the signed-in member: nobody else has it, private profiles
 * included. A database function answers, and says nothing about who has it.
 */
export const isHandleAvailable = async (handle: string): Promise<boolean> => {
  const { data, error } = await getSupabase().rpc('handle_available', { candidate: handle });
  if (error) throw error;
  return data === true;
};
