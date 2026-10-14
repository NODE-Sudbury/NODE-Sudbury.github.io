import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Member } from '../models/member';
import type { Content } from '../store/content';
import { boardRowToMember, fetchBoardRows, withBoard, withSupabaseBoard } from './board';

const URL = 'https://project.supabase.co';

const sampleMember = (id: string, parentId: string, name: string): Member => ({
  id,
  parentId,
  name,
  title: 'Old',
  order: 0,
  photo: '',
  photoUrl: '/images/old.jpg',
  socials: [],
});

const content = {
  teams: [
    { id: 'volunteers', title: 'Volunteers' },
    { id: 'board', title: 'Board of Directors' },
  ],
  members: [sampleMember('a', 'board', 'Old Board Person'), sampleMember('v', 'volunteers', 'TBD')],
} as unknown as Partial<Content>;

const rows = [
  {
    id: 'uuid-1',
    name: 'Hannan Max',
    title: 'Technical Lead',
    photo_path: 'h.jpg',
    linkedin_url: 'https://linkedin.com/in/hannanmax',
    github_url: 'https://github.com/hannanmax',
    twitter_url: '',
    website_url: 'https://hannanmax.com',
    sort_order: 2,
  },
];

describe('boardRowToMember', () => {
  it('makes a member of the board with a photo address and a link for each site', () => {
    expect(boardRowToMember(rows[0]!, 'board', URL)).toEqual({
      id: 'uuid-1',
      parentId: 'board',
      name: 'Hannan Max',
      title: 'Technical Lead',
      order: 2,
      photo: '',
      photoUrl: `${URL}/storage/v1/object/public/board-photos/h.jpg`,
      socials: [
        { icon: 'linkedin', name: 'LinkedIn', link: 'https://linkedin.com/in/hannanmax' },
        { icon: 'github', name: 'GitHub', link: 'https://github.com/hannanmax' },
        { icon: 'website', name: 'Website', link: 'https://hannanmax.com' },
      ],
    });
  });

  it('has no photo address without a photo, and no links without links', () => {
    const member = boardRowToMember({ id: 'x', name: 'N', title: null }, 'board', URL);

    expect(member).toMatchObject({ photoUrl: '', socials: [], title: '', order: 0 });
  });
});

describe('withBoard', () => {
  it('replaces the members of the board and keeps the other teams', () => {
    const result = withBoard(content, rows, URL);

    expect(result.members?.map(({ name }) => name).sort()).toEqual(['Hannan Max', 'TBD']);
    expect(result.members?.find(({ name }) => name === 'Hannan Max')?.parentId).toBe('board');
    expect(result.teams).toBe(content.teams);
  });

  it('leaves the content as it was without cards, or without a board team or members', () => {
    expect(withBoard(content, [], URL)).toBe(content);
    expect(withBoard({ ...content, teams: [] }, rows, URL)).toEqual({ ...content, teams: [] });
    const withoutMembers = { teams: content.teams } as Partial<Content>;
    expect(withBoard(withoutMembers, rows, URL)).toBe(withoutMembers);
  });
});

describe('fetchBoardRows', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the cards with the public key', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => rows } as Response);

    await expect(fetchBoardRows(URL, 'anon')).resolves.toEqual(rows);
    const [address, init] = fetch.mock.calls[0]!;
    expect(address).toBe(`${URL}/rest/v1/board_members?select=*&order=sort_order.asc,name.asc`);
    expect(init).toEqual({ headers: { apikey: 'anon', Authorization: 'Bearer anon' } });
  });

  it('gives nothing without a Supabase project', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');

    await expect(fetchBoardRows(undefined, undefined)).resolves.toBeUndefined();
    await expect(fetchBoardRows(URL, undefined)).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('gives nothing, with a warning, when Supabase says no or cannot be reached', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);
    await expect(fetchBoardRows(URL, 'anon')).resolves.toBeUndefined();

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(fetchBoardRows(URL, 'anon')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('withSupabaseBoard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the board from Supabase, and keeps the content when it cannot be read', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => rows,
    } as Response);
    const result = await withSupabaseBoard(content, URL, 'anon');
    expect(result.members?.some(({ name }) => name === 'Hannan Max')).toBe(true);

    expect(await withSupabaseBoard(content, undefined, undefined)).toBe(content);
  });
});
