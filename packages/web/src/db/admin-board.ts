import type { BoardMember, BoardMemberInput } from '../models/board-member';
import { getSupabase } from '../supabase';
import { logoExtension } from '../utils/organization';

type Row = Record<string, string | number | null>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The public bucket for the board photos. Only the super admin and admins write to it. */
export const BOARD_PHOTO_BUCKET = 'board-photos';

/** Postgres' error for a member who already has a card, since a member has at most one. */
const UNIQUE_VIOLATION = '23505';

/** Thrown when the member picked for a card already has another card. */
export class CardLinkTakenError extends Error {
  constructor() {
    super('That member already has a card.');
    this.name = 'CardLinkTakenError';
  }
}

const COLUMNS =
  'id, name, title, photo_path, linkedin_url, github_url, twitter_url, website_url, user_id, sort_order';

const toBoardMember = (row: Row): BoardMember => {
  const photoPath = text(row['photo_path']);
  return {
    id: text(row['id']),
    name: text(row['name']),
    title: text(row['title']),
    photoPath,
    photoUrl: photoPath
      ? getSupabase().storage.from(BOARD_PHOTO_BUCKET).getPublicUrl(photoPath).data.publicUrl
      : '',
    linkedinUrl: text(row['linkedin_url']),
    githubUrl: text(row['github_url']),
    twitterUrl: text(row['twitter_url']),
    websiteUrl: text(row['website_url']),
    userId: text(row['user_id']) || undefined,
    sortOrder: typeof row['sort_order'] === 'number' ? row['sort_order'] : 0,
  };
};

/** Every board card in the order the site lists them. */
export const fetchBoardMembers = async (): Promise<BoardMember[]> => {
  const { data, error } = await getSupabase()
    .from('board_members')
    .select(COLUMNS)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map(toBoardMember);
};

/** The sort order after the last one, so a new card goes to the end. */
const nextSortOrder = async (): Promise<number> => {
  const { data } = await getSupabase()
    .from('board_members')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  const last = (data as Row[] | null)?.[0]?.['sort_order'];
  return typeof last === 'number' ? last + 1 : 0;
};

/**
 * Adds a board card, or changes one that has an `id`. A new photo goes to storage first. If the
 * table then refuses the change, the new file is removed again, and when it works the old photo is
 * removed, so storage holds no file that nothing points to.
 */
export const saveBoardMember = async (
  input: BoardMemberInput,
  existing?: BoardMember,
): Promise<void> => {
  const supabase = getSupabase();
  const id = input.id ?? crypto.randomUUID();
  let photoPath = existing?.photoPath ?? '';
  let uploaded = '';
  if (input.photo) {
    uploaded = `${id}-${Date.now().toString(36)}.${logoExtension(input.photo.type)}`;
    const { error } = await supabase.storage
      .from(BOARD_PHOTO_BUCKET)
      .upload(uploaded, input.photo, { contentType: input.photo.type });
    if (error) throw new Error(error.message);
    photoPath = uploaded;
  }
  const row = {
    name: input.name.trim(),
    title: input.title.trim(),
    photo_path: photoPath,
    linkedin_url: input.linkedinUrl,
    github_url: input.githubUrl,
    twitter_url: input.twitterUrl,
    website_url: input.websiteUrl,
    user_id: input.userId ?? null,
  };
  const { error } = input.id
    ? await supabase.from('board_members').update(row).eq('id', input.id)
    : await supabase
        .from('board_members')
        .insert({ id, ...row, sort_order: await nextSortOrder() });
  if (error) {
    if (uploaded) await supabase.storage.from(BOARD_PHOTO_BUCKET).remove([uploaded]);
    throw error.code === UNIQUE_VIOLATION ? new CardLinkTakenError() : new Error(error.message);
  }
  if (uploaded && existing?.photoPath) {
    await supabase.storage.from(BOARD_PHOTO_BUCKET).remove([existing.photoPath]);
  }
};

/** Removes a board card, and its photo from storage. */
export const deleteBoardMember = async (member: BoardMember): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.from('board_members').delete().eq('id', member.id);
  if (error) throw new Error(error.message);
  if (member.photoPath) await supabase.storage.from(BOARD_PHOTO_BUCKET).remove([member.photoPath]);
};
