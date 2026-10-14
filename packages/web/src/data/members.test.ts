import { describe, expect, it } from 'vitest';
import type { Member } from '../models/member';
import { boardMembers } from './members';

const member = (id: string, parentId: string, name: string, order: number): Member => ({
  id,
  parentId,
  name,
  order,
  photo: '',
  photoUrl: '',
  socials: [],
  title: 'Role',
});

describe('boardMembers', () => {
  const teams = [
    { id: '1', title: 'Volunteers' },
    { id: '0', title: 'Board of Directors' },
  ];

  it('lists the members of the first team by title, in order', () => {
    const members = [
      member('1', '0', 'Heather', 1),
      member('0', '0', 'Dean', 0),
      member('0', '1', 'Sam', 0),
    ];

    expect(boardMembers(teams, members).map(({ name }) => name)).toEqual(['Dean', 'Heather']);
  });

  it('leaves out places held for people to be announced', () => {
    expect(
      boardMembers(teams, [member('0', '0', 'TBD', 0), member('1', '0', 'Dean', 1)]),
    ).toHaveLength(1);
  });

  it('has nobody without a team', () => {
    expect(boardMembers([], [member('0', '0', 'Dean', 0)])).toEqual([]);
  });
});
