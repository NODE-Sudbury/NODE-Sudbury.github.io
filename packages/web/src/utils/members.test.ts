import { describe, expect, it } from 'vitest';
import type { Member } from '../models/member';
import { isPlaceholderMember, memberCardSpeaker, memberPath, memberSlug } from './members';

const member: Member = {
  id: '0',
  parentId: '0',
  name: 'Dean Lupini',
  order: 0,
  photo: '/images/dean.jpg',
  photoUrl: '/images/dean.jpg',
  socials: [],
  title: 'President',
};

describe('memberSlug and memberPath', () => {
  it('makes a readable address from the name', () => {
    expect(memberSlug(member)).toBe('dean-lupini');
    expect(memberPath(member)).toBe('/team/dean-lupini');
  });

  it('drops accents and punctuation', () => {
    expect(memberSlug({ name: "Renée O'Neil-Côté" })).toBe('renee-o-neil-cote');
  });
});

describe('isPlaceholderMember', () => {
  it('knows a name that is still to be announced', () => {
    expect(isPlaceholderMember({ name: 'TBD' })).toBe(true);
    expect(isPlaceholderMember({ name: ' tbd ' })).toBe(true);
    expect(isPlaceholderMember(member)).toBe(false);
  });
});

describe('memberCardSpeaker', () => {
  it('shows the title where a speaker card shows their company', () => {
    expect(memberCardSpeaker(member)).toMatchObject({
      id: 'dean-lupini',
      name: 'Dean Lupini',
      company: 'President',
      country: '',
      photoUrl: '/images/dean.jpg',
    });
  });
});
