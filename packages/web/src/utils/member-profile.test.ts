import { describe, expect, it } from 'vitest';
import {
  handleProblem,
  memberSince,
  publicPath,
  normalizeProfileUrl,
  profileHeadline,
  profileSocials,
  suggestHandle,
} from './member-profile';

describe('handleProblem', () => {
  it('accepts a handle of three to thirty lowercase letters, digits and hyphens', () => {
    for (const handle of ['hannan', 'dean-lupini', 'a1b', 'x'.repeat(30)]) {
      expect(handleProblem(handle)).toBeUndefined();
    }
  });

  it('treats an empty handle as none yet', () => {
    expect(handleProblem('')).toBeUndefined();
  });

  it.each([
    ['ab', 'too-short'],
    ['x'.repeat(31), 'too-long'],
    ['Dean', 'characters'],
    ['dean_l', 'characters'],
    ['dean lupini', 'characters'],
    ['-dean', 'edges'],
    ['dean-', 'edges'],
  ])('says what is wrong with %s', (handle, problem) => {
    expect(handleProblem(handle)).toBe(problem);
  });
});

describe('suggestHandle', () => {
  it('makes a handle from a name', () => {
    expect(suggestHandle('Dean Lupini')).toBe('dean-lupini');
    expect(suggestHandle("Renée O'Neil-Côté")).toBe('renee-o-neil-cote');
  });

  it('keeps it within thirty characters and without a trailing hyphen', () => {
    const handle = suggestHandle('A very long name that goes on and on and on');
    expect(handle.length).toBeLessThanOrEqual(30);
    expect(handle.endsWith('-')).toBe(false);
  });
});

describe('normalizeProfileUrl', () => {
  it('means no link for an empty box', () => {
    expect(normalizeProfileUrl('  ')).toBeNull();
  });

  it('adds https:// when it is missing', () => {
    expect(normalizeProfileUrl('linkedin.com/in/ada')).toEqual({
      url: 'https://linkedin.com/in/ada',
    });
  });

  it('keeps a full address', () => {
    expect(normalizeProfileUrl('https://github.com/ada')).toEqual({
      url: 'https://github.com/ada',
    });
  });

  it('only takes the site a box is for', () => {
    expect(normalizeProfileUrl('github.com/ada', ['linkedin.com'])).toEqual({ error: 'host' });
    expect(normalizeProfileUrl('www.linkedin.com/in/ada', ['linkedin.com'])).toEqual({
      url: 'https://www.linkedin.com/in/ada',
    });
  });

  it.each(['not a link', 'javascript:alert(1)', 'ftp://example.com', 'localhost'])(
    'refuses %s',
    (value) => {
      expect(normalizeProfileUrl(value)).toEqual({ error: 'invalid' });
    },
  );
});

describe('profileSocials', () => {
  it('lists only the links that are filled in', () => {
    expect(
      profileSocials({
        linkedinUrl: 'https://linkedin.com/in/ada',
        githubUrl: '',
        twitterUrl: 'https://x.com/ada',
        websiteUrl: '',
      }),
    ).toEqual([
      { icon: 'linkedin', name: 'LinkedIn', link: 'https://linkedin.com/in/ada' },
      { icon: 'x', name: 'X', link: 'https://x.com/ada' },
    ]);
  });
});

describe('profileHeadline', () => {
  const base = { jobTitle: '', company: '', program: '', school: '' };

  it('names the job and company of a professional', () => {
    expect(
      profileHeadline({
        ...base,
        memberType: 'professional',
        jobTitle: 'Engineer',
        company: 'Acme',
      }),
    ).toBe('Engineer at Acme');
    expect(profileHeadline({ ...base, memberType: 'professional', jobTitle: 'Engineer' })).toBe(
      'Engineer',
    );
  });

  it('names the program and school of a student', () => {
    expect(
      profileHeadline({
        ...base,
        memberType: 'student',
        program: 'Computer Science',
        school: 'Laurentian University',
      }),
    ).toBe('Computer Science, Laurentian University');
  });
});

describe('publicPath', () => {
  const profile = { id: 'cea1bd28-92ce-42ef-98b0-0c1967f1355a', handle: 'hannan', isPublic: true };

  it('is the handle address when there is a handle', () => {
    expect(publicPath(profile)).toBe('/members/hannan');
  });

  it('is the older address with the id when there is no handle', () => {
    expect(publicPath({ ...profile, handle: '' })).toBe(`/profile/${profile.id}`);
  });

  it('is nothing for a private profile', () => {
    expect(publicPath({ ...profile, isPublic: false })).toBe('');
  });
});

describe('memberSince', () => {
  it('names the month and year they joined', () => {
    expect(memberSince('2026-08-29T01:11:00Z')).toBe('August 2026');
  });
});
