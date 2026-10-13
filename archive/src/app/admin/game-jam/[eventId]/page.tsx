export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { GameJamAdminClient } from './GameJamAdminClient';

export default async function AdminGameJamPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!['board', 'admin', 'super_admin'].includes(member?.role ?? '')) {
    redirect('/dashboard');
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, starts_at, ends_at, status')
    .eq('id', params.eventId)
    .eq('type', 'game_jam')
    .is('deleted_at', null)
    .single();

  if (!event) notFound();

  const [{ data: themes }, { data: entries }] = await Promise.all([
    supabase
      .from('game_jam_themes')
      .select('id, theme, revealed_at, is_active')
      .eq('event_id', event.id)
      .order('revealed_at', { ascending: false }),

    supabase
      .from('game_jam_entries')
      .select(`
        id, title, description, play_url, repo_url, screenshot_url, categories,
        member_id, created_at,
        votes:game_jam_votes(category)
      `)
      .eq('event_id', event.id)
      .order('created_at', { ascending: true }),
  ]);

  // Compute tallies per entry
  const entriesWithTallies = (entries ?? []).map((entry) => {
    const tallies: Record<string, number> = {};
    for (const v of entry.votes ?? []) {
      tallies[v.category] = (tallies[v.category] ?? 0) + 1;
    }
    return { ...entry, tallies };
  });

  const activeTheme = (themes ?? []).find((t) => t.is_active) ?? null;

  return (
    <GameJamAdminClient
      event={event}
      activeTheme={activeTheme}
      allThemes={themes ?? []}
      entries={entriesWithTallies}
    />
  );
}
