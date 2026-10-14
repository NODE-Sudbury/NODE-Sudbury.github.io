import type { DailyViews, PageViews } from '../models/analytics';
import { getSupabase } from '../supabase';

type Row = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const count = (value: unknown): number => {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : 0;
};

/** The most viewed pages over the last `days` days. Only the super admin and admins get rows. */
export const fetchTopPages = async (days: number): Promise<PageViews[]> => {
  const { data, error } = await getSupabase().rpc('analytics_pages', { p_days: days });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((row) => ({
    path: text(row['path']),
    views: count(row['views']),
  }));
};

/** The views on each of the last `days` days, with a row for days nobody visited. */
export const fetchDailyViews = async (days: number): Promise<DailyViews[]> => {
  const { data, error } = await getSupabase().rpc('analytics_daily', { p_days: days });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((row) => ({
    day: text(row['day']),
    views: count(row['views']),
  }));
};
