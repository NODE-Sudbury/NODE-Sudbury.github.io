export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { GameJamClient } from './GameJamClient';

export default async function GameJamPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, starts_at, ends_at, status')
    .eq('slug', params.slug)
    .eq('type', 'game_jam')
    .is('deleted_at', null)
    .single();

  if (!event) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: activeTheme },
    { data: allEntries },
    { data: myEntry },
    { data: myVotes },
  ] = await Promise.all([
    supabase
      .from('game_jam_themes')
      .select('id, theme, revealed_at')
      .eq('event_id', event.id)
      .eq('is_active', true)
      .maybeSingle(),

    supabase
      .from('game_jam_entries')
      .select(`
        id, title, description, play_url, repo_url, screenshot_url, categories,
        team_id, member_id,
        votes:game_jam_votes(category)
      `)
      .eq('event_id', event.id)
      .order('created_at', { ascending: false }),

    user
      ? supabase
          .from('game_jam_entries')
          .select('id, title, description, play_url, repo_url, screenshot_url, categories')
          .eq('event_id', event.id)
          .eq('member_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    user
      ? supabase
          .from('game_jam_votes')
          .select('entry_id, category')
          .in(
            'entry_id',
            // fetch after we have entries - placeholder, handled client-side
            ['00000000-0000-0000-0000-000000000000']
          )
      : Promise.resolve({ data: [] }),
  ]);

  // Re-fetch user votes now that we have entry IDs
  let userVotes: { entry_id: string; category: string }[] = [];
  if (user && allEntries && allEntries.length > 0) {
    const entryIds = allEntries.map((e) => e.id);
    const { data: votes } = await supabase
      .from('game_jam_votes')
      .select('entry_id, category')
      .eq('member_id', user.id)
      .in('entry_id', entryIds);
    userVotes = votes ?? [];
  }

  // Compute vote counts per entry per category
  const entriesWithCounts = (allEntries ?? []).map((entry) => {
    const voteCounts: Record<string, number> = {};
    for (const v of entry.votes ?? []) {
      voteCounts[v.category] = (voteCounts[v.category] ?? 0) + 1;
    }
    return { ...entry, voteCounts };
  });

  return (
    <GameJamClient
      event={event}
      activeTheme={activeTheme ?? null}
      entries={entriesWithCounts}
      myEntry={myEntry ?? null}
      userVotes={userVotes}
      isAuthenticated={!!user}
      userId={user?.id ?? null}
    />
  );
}
