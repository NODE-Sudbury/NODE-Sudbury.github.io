import type { CardSpeaker } from '../components/shared/speaker-card';
import type { Member } from '../models/member';

/** A member whose name is still to be announced has no profile page of their own. */
export const isPlaceholderMember = ({ name }: Pick<Member, 'name'>): boolean =>
  /^tbd$/i.test(name.trim());

/** A short readable address for a member's page: `Dean Lupini` becomes `dean-lupini`. */
export const memberSlug = ({ name }: Pick<Member, 'name'>): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** A member's own page, such as `/team/dean-lupini`. */
export const memberPath = (member: Pick<Member, 'name'>): string => `/team/${memberSlug(member)}`;

/** What the speaker card shows for a member: their photo, name and title. */
export const memberCardSpeaker = (member: Member): CardSpeaker => ({
  id: memberSlug(member),
  name: member.name,
  photoUrl: member.photoUrl,
  company: member.title,
  country: '',
  socials: member.socials,
});
