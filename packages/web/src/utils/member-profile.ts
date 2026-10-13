import type { MemberProfile, PublicProfile } from '../models/member-profile';
import type { Social } from '../models/social';

/** Three to thirty lowercase letters, digits and hyphens, not starting or ending with a hyphen. */
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export type HandleProblem = 'too-short' | 'too-long' | 'characters' | 'edges';

/** What is wrong with a handle, or nothing when it is fine. An empty handle means none yet. */
export const handleProblem = (handle: string): HandleProblem | undefined => {
  if (!handle) return undefined;
  if (handle.length < 3) return 'too-short';
  if (handle.length > 30) return 'too-long';
  if (!/^[a-z0-9-]+$/.test(handle)) return 'characters';
  if (!HANDLE_PATTERN.test(handle)) return 'edges';
  return undefined;
};

/** A handle to offer someone from their name: `Dean Lupini` becomes `dean-lupini`. */
export const suggestHandle = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');

export type ProfileUrl = { url: string } | { error: 'invalid' | 'host' };

/**
 * A link a member typed, as a full address: `linkedin.com/in/ada` gets `https://`. With `hosts`,
 * the address must be on one of them, so the LinkedIn box only takes LinkedIn. An empty box is
 * fine and means no link.
 */
export const normalizeProfileUrl = (
  value: string,
  hosts?: readonly string[],
): ProfileUrl | null => {
  const text = value.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { error: 'invalid' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { error: 'invalid' };
  if (!url.hostname.includes('.')) return { error: 'invalid' };
  if (hosts && !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    return { error: 'host' };
  }
  return { url: url.href };
};

/** The links a profile shows as icons, for the ones the member filled in. */
export const profileSocials = (
  profile: Pick<PublicProfile, 'linkedinUrl' | 'githubUrl' | 'twitterUrl' | 'websiteUrl'>,
): Social[] =>
  [
    { icon: 'linkedin', name: 'LinkedIn', link: profile.linkedinUrl },
    { icon: 'github', name: 'GitHub', link: profile.githubUrl },
    { icon: 'x', name: 'X', link: profile.twitterUrl },
    { icon: 'website', name: 'Website', link: profile.websiteUrl },
  ].filter(({ link }) => link);

/** One line under the name: the job and company, or the program and school for a student. */
export const profileHeadline = (
  profile: Pick<MemberProfile, 'memberType' | 'jobTitle' | 'company' | 'program' | 'school'>,
): string =>
  profile.memberType === 'student'
    ? [profile.program, profile.school].filter(Boolean).join(', ')
    : [profile.jobTitle, profile.company].filter(Boolean).join(' at ');
