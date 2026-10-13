import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemberProfile } from '../models/member-profile';
import {
  fetchOwnProfile,
  fetchPublicProfile,
  HandleTakenError,
  saveOwnProfile,
} from './member-profiles';

const query = {
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};
const from = vi.fn(() => query);
vi.mock('../supabase', () => ({ getSupabase: () => ({ from }) }));

const profile: MemberProfile = {
  handle: 'ada',
  fullName: 'Ada Lovelace',
  avatarUrl: '',
  memberType: 'professional',
  jobTitle: 'Engineer',
  company: ' ',
  school: '',
  program: '',
  bio: 'Hello',
  pronouns: '',
  linkedinUrl: 'https://linkedin.com/in/ada',
  githubUrl: '',
  twitterUrl: '',
  websiteUrl: '',
  discordTag: '',
  isPublic: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
});

describe('fetchOwnProfile', () => {
  it('reads the member by id and maps the columns', async () => {
    query.maybeSingle.mockResolvedValue({
      data: {
        handle: 'ada',
        full_name: 'Ada Lovelace',
        member_type: 'student',
        discord_tag: 'ada#1',
        is_public: false,
      },
      error: null,
    });

    const own = await fetchOwnProfile('user-1');

    expect(from).toHaveBeenCalledWith('members');
    expect(query.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(own).toMatchObject({
      handle: 'ada',
      fullName: 'Ada Lovelace',
      memberType: 'student',
      discordTag: 'ada#1',
      isPublic: false,
      company: '',
    });
  });

  it('is nothing when there is no row', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(fetchOwnProfile('user-1')).resolves.toBeUndefined();
  });

  it('throws what Supabase reports', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: new Error('Boom') });

    await expect(fetchOwnProfile('user-1')).rejects.toThrow('Boom');
  });
});

describe('saveOwnProfile', () => {
  it('saves the profile to the own row, with blank boxes as nothing', async () => {
    query.eq.mockResolvedValue({ error: null });

    await saveOwnProfile('user-1', profile);

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: 'ada',
        full_name: 'Ada Lovelace',
        company: null,
        school: null,
        linkedin_url: 'https://linkedin.com/in/ada',
        is_public: true,
      }),
    );
    expect(query.eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('says when the handle is taken', async () => {
    query.eq.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });

    await expect(saveOwnProfile('user-1', profile)).rejects.toBeInstanceOf(HandleTakenError);
  });

  it('throws other errors as they are', async () => {
    query.eq.mockResolvedValue({ error: { code: '42501', message: 'Not allowed' } });

    await expect(saveOwnProfile('user-1', profile)).rejects.toMatchObject({ code: '42501' });
  });
});

describe('fetchPublicProfile', () => {
  it('reads the public view by handle', async () => {
    query.maybeSingle.mockResolvedValue({ data: { handle: 'ada', full_name: 'Ada' }, error: null });

    const found = await fetchPublicProfile('ada');

    expect(from).toHaveBeenCalledWith('public_profiles');
    expect(query.eq).toHaveBeenCalledWith('handle', 'ada');
    expect(found).toMatchObject({ handle: 'ada', fullName: 'Ada' });
    expect(found).not.toHaveProperty('discordTag');
  });

  it('is nothing for a private or unknown handle', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(fetchPublicProfile('nobody')).resolves.toBeUndefined();
  });
});
