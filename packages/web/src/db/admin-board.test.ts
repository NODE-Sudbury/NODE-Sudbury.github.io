import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardMember } from '../models/board-member';
import {
  CardLinkTakenError,
  deleteBoardMember,
  fetchBoardMembers,
  saveBoardMember,
} from './admin-board';

let result: {
  data?: unknown;
  error: { message: string; code?: string } | null;
} = { data: [], error: null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chain: Record<string, any> = {};
for (const method of ['select', 'order', 'eq', 'limit', 'insert', 'update', 'delete']) {
  chain[method] = vi.fn(() => chain);
}
chain['then'] = (resolve: (value: typeof result) => unknown) =>
  Promise.resolve(result).then(resolve);

const from = vi.fn(() => chain);
const upload = vi.fn();
const remove = vi.fn();
const getPublicUrl = vi.fn((path: string) => ({
  data: { publicUrl: `https://cdn.example/${path}` },
}));
const bucket = vi.fn(() => ({ upload, remove, getPublicUrl }));

vi.mock('../supabase', () => ({ getSupabase: () => ({ from, storage: { from: bucket } }) }));

const card: BoardMember = {
  id: 'b1',
  name: 'Hannan',
  title: 'Technical Lead',
  photoPath: 'old.jpg',
  photoUrl: 'https://cdn.example/old.jpg',
  linkedinUrl: '',
  githubUrl: '',
  twitterUrl: '',
  websiteUrl: '',
  userId: 'u1',
  sortOrder: 2,
};

const input = {
  name: ' Dean ',
  title: ' President ',
  linkedinUrl: 'https://linkedin.com/in/dean',
  githubUrl: '',
  twitterUrl: '',
  websiteUrl: '',
  userId: undefined,
};

const photo = new File(['jpg'], 'dean.jpg', { type: 'image/jpeg' });

describe('db/admin-board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    result = { data: [], error: null };
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
  });

  it('lists the cards with the address of each photo and the linked account', async () => {
    result = {
      data: [
        {
          id: 'b1',
          name: 'Hannan',
          title: 'Technical Lead',
          photo_path: 'h.jpg',
          user_id: 'u1',
          sort_order: 2,
        },
        { id: 'b2', name: 'Dean', title: null, photo_path: '', user_id: null, sort_order: null },
      ],
      error: null,
    };

    const cards = await fetchBoardMembers();

    expect(from).toHaveBeenCalledWith('board_members');
    expect(bucket).toHaveBeenCalledWith('board-photos');
    expect(cards[0]).toMatchObject({
      title: 'Technical Lead',
      photoUrl: 'https://cdn.example/h.jpg',
      userId: 'u1',
      sortOrder: 2,
    });
    expect(cards[1]).toMatchObject({ title: '', photoUrl: '', userId: undefined, sortOrder: 0 });
  });

  it('throws when the cards cannot be read', async () => {
    result = { error: { message: 'denied' } };

    await expect(fetchBoardMembers()).rejects.toThrow('denied');
  });

  it('adds a card: the photo goes to storage, then the card goes to the end of the list', async () => {
    result = { data: [{ sort_order: 7 }], error: null };

    await saveBoardMember({ ...input, photo });

    const [path] = upload.mock.calls[0] as [string];
    expect(path).toMatch(/^[0-9a-f-]{36}-[a-z0-9]+\.jpg$/);
    expect(chain['insert']).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Dean',
        title: 'President',
        photo_path: path,
        user_id: null,
        sort_order: 8,
      }),
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('changes a card, keeps its photo, and links it to an account', async () => {
    await saveBoardMember({ ...input, id: 'b1', userId: 'u1' }, card);

    expect(upload).not.toHaveBeenCalled();
    expect(chain['update']).toHaveBeenCalledWith(
      expect.objectContaining({ photo_path: 'old.jpg', user_id: 'u1' }),
    );
    expect(chain['eq']).toHaveBeenCalledWith('id', 'b1');
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes the old photo once a new one is saved', async () => {
    await saveBoardMember({ ...input, id: 'b1', photo }, card);

    expect(remove).toHaveBeenCalledWith(['old.jpg']);
  });

  it('removes the new photo again, and says so, when the member already has a card', async () => {
    result = { data: [], error: { message: 'duplicate key', code: '23505' } };

    await expect(saveBoardMember({ ...input, userId: 'u1', photo })).rejects.toBeInstanceOf(
      CardLinkTakenError,
    );

    const [path] = upload.mock.calls[0] as [string];
    expect(remove).toHaveBeenCalledWith([path]);
  });

  it('throws other failures as they are', async () => {
    result = { data: [], error: { message: 'denied', code: '42501' } };

    await expect(saveBoardMember(input)).rejects.toThrow('denied');
  });

  it('deletes the card and its photo', async () => {
    await deleteBoardMember(card);

    expect(chain['delete']).toHaveBeenCalled();
    expect(chain['eq']).toHaveBeenCalledWith('id', 'b1');
    expect(remove).toHaveBeenCalledWith(['old.jpg']);
  });

  it('keeps the photo when the card cannot be deleted', async () => {
    result = { error: { message: 'denied' } };

    await expect(deleteBoardMember(card)).rejects.toThrow('denied');
    expect(remove).not.toHaveBeenCalled();
  });
});
