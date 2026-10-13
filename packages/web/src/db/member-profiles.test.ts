import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemberProfile } from '../models/member-profile';
import {
  fetchOwnProfile,
  fetchPublicProfile,
  HandleTakenError,
  isHandleAvailable,
  removeAvatar,
  saveOwnProfile,
  uploadAvatar,
} from './member-profiles';

const query = {
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};
const from = vi.fn(() => query);
const rpc = vi.fn();
const storage = {
  upload: vi.fn(),
  getPublicUrl: vi.fn(() => ({
    data: { publicUrl: 'https://x.supabase.co/storage/avatars/u/avatar.jpg' },
  })),
};
vi.mock('../supabase', () => ({
  getSupabase: () => ({ from, rpc, storage: { from: () => storage } }),
}));

const profile: MemberProfile = {
  id: 'user-1',
  createdAt: '2026-08-29T01:11:00Z',
  isExclusiveMember: false,
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

    const found = await fetchPublicProfile({ handle: 'ada' });

    expect(from).toHaveBeenCalledWith('public_profiles');
    expect(query.eq).toHaveBeenCalledWith('handle', 'ada');
    expect(found).toMatchObject({ handle: 'ada', fullName: 'Ada' });
    expect(found).not.toHaveProperty('discordTag');
  });

  it('finds a profile by the id older links use', async () => {
    query.maybeSingle.mockResolvedValue({
      data: { id: 'user-1', handle: null, full_name: 'Ada', is_exclusive_member: true },
      error: null,
    });

    const found = await fetchPublicProfile({ id: 'user-1' });

    expect(query.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(found).toMatchObject({ id: 'user-1', handle: '', isExclusiveMember: true });
  });

  it('is nothing for a private or unknown handle', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(fetchPublicProfile({ handle: 'nobody' })).resolves.toBeUndefined();
  });
});

describe('isHandleAvailable', () => {
  it('asks the database function, which counts private profiles too', async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(isHandleAvailable('ada')).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('handle_available', { candidate: 'ada' });
  });

  it('is false when the handle is taken', async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(isHandleAvailable('ada')).resolves.toBe(false);
  });

  it('throws when the question fails', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('Not signed in') });

    await expect(isHandleAvailable('ada')).rejects.toThrow('Not signed in');
  });
});

describe('uploadAvatar and removeAvatar', () => {
  it("saves the photo in the member's own folder and makes it their profile photo", async () => {
    storage.upload.mockResolvedValue({ error: null });
    query.eq.mockResolvedValue({ error: null });
    const photo = new Blob(['x'], { type: 'image/jpeg' });

    const url = await uploadAvatar('user-1', photo);

    expect(storage.upload).toHaveBeenCalledWith('user-1/avatar.jpg', photo, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });
    expect(url).toMatch(/^https:\/\/x\.supabase\.co\/storage\/avatars\/u\/avatar\.jpg\?v=\d+$/);
    expect(query.update).toHaveBeenCalledWith({ avatar_url: url });
  });

  it('does not save the address when the upload fails', async () => {
    storage.upload.mockResolvedValue({ error: new Error('Too big') });

    await expect(uploadAvatar('user-1', new Blob(['x']))).rejects.toThrow('Too big');
    expect(query.update).not.toHaveBeenCalled();
  });

  it('takes the photo off the profile', async () => {
    query.eq.mockResolvedValue({ error: null });

    await removeAvatar('user-1');

    expect(query.update).toHaveBeenCalledWith({ avatar_url: null });
  });
});
