import type { Member } from '../models/member';
import type { Team } from '../models/team';
import type { Content } from '../store/content';
import { profileSocials } from '../utils/member-profile';
import { fetchPublicRows, type Row } from './public-rows';

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const PHOTO_BUCKET = 'board-photos';

/** A board card from the `board_members` table, as the pages know a member of the board. */
export const boardRowToMember = (row: Row, parentId: string, supabaseUrl: string): Member => {
  const photoPath = text(row['photo_path']);
  return {
    id: text(row['id']),
    parentId,
    name: text(row['name']),
    title: text(row['title']),
    order: typeof row['sort_order'] === 'number' ? row['sort_order'] : 0,
    photo: '',
    photoUrl: photoPath
      ? `${supabaseUrl}/storage/v1/object/public/${PHOTO_BUCKET}/${photoPath}`
      : '',
    socials: profileSocials({
      linkedinUrl: text(row['linkedin_url']),
      githubUrl: text(row['github_url']),
      twitterUrl: text(row['twitter_url']),
      websiteUrl: text(row['website_url']),
    }),
  };
};

/** The team the site shows as the board: the first team by title, like `boardMembers` picks it. */
const boardTeam = (teams: Pick<Team, 'id' | 'title'>[] = []) =>
  [...teams].sort((a, b) => a.title.localeCompare(b.title))[0];

/**
 * The content with the board's members taken from the cards. Other teams keep their members. Without
 * cards, or without a board team to put them in, the content stays as it was.
 */
export const withBoard = (
  content: Partial<Content>,
  rows: Row[],
  supabaseUrl: string,
): Partial<Content> => {
  const board = boardTeam(content.teams);
  if (!board || !content.members || !rows.length) return content;
  const cards = rows.map((row) => boardRowToMember(row, board.id, supabaseUrl));
  return {
    ...content,
    members: [...content.members.filter(({ parentId }) => parentId !== board.id), ...cards],
  };
};

/**
 * The board cards from Supabase, read with the public key as any visitor could. Undefined when this
 * build has no Supabase project or cannot reach it, so the site builds with its own board instead.
 */
export const fetchBoardRows = (
  url: string | undefined,
  anonKey: string | undefined,
): Promise<Row[] | undefined> =>
  fetchPublicRows('board_members', 'sort_order.asc,name.asc', 'the board', url, anonKey);

/** The content with the board from Supabase when this build can read it. */
export const withSupabaseBoard = async (
  content: Partial<Content>,
  url = import.meta.env['NEXT_PUBLIC_SUPABASE_URL'] as string | undefined,
  anonKey = import.meta.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] as string | undefined,
): Promise<Partial<Content>> => {
  const rows = await fetchBoardRows(url, anonKey);
  return rows && url ? withBoard(content, rows, url) : content;
};
