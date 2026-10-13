export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { DemoBoard } from './DemoBoard';

type VoteCounts = { best_demo: number; most_innovative: number; crowd_favorite: number };

export default async function DemosPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: event } = await supabase
    .from('events').select('id, title, type, status, starts_at').eq('slug', params.slug).single();
  if (!event) return notFound();

  // Resolve authenticated member
  const { data: { user } } = await supabase.auth.getUser();
  let memberId: string | null = null;
  if (user) {
    const { data: member } = await supabase.from('members').select('id').eq('user_id', user.id).single();
    if (member) memberId = member.id;
  }

  // Fetch all showcases for this event
  const { data: slots } = await supabase
    .from('demo_day_showcases')
    .select('*, members(display_name, avatar_url)')
    .eq('event_id', event.id)
    .order('slot_order', { ascending: true });

  const allSlots = (slots ?? []) as Array<Record<string, unknown>>;
  const showcaseIds = allSlots.map(s => s.id as string);

  // Aggregate vote counts per showcase per category, and build myVoteMap for the current member
  const voteCounts: Record<string, VoteCounts> = {};
  let myVoteMap: Record<string, string[]> = {};

  if (showcaseIds.length > 0) {
    const allVotesQuery = supabase
      .from('demo_day_votes')
      .select('showcase_id, member_id, category')
      .in('showcase_id', showcaseIds);

    const myVotesQuery = memberId
      ? supabase
          .from('demo_day_votes')
          .select('showcase_id, category')
          .eq('member_id', memberId)
          .in('showcase_id', showcaseIds)
      : null;

    const [allVotesRes, myVotesRes] = await Promise.all([
      allVotesQuery,
      myVotesQuery ?? Promise.resolve({ data: null }),
    ]);

    for (const v of (allVotesRes.data ?? []) as Array<{ showcase_id: string; category: string }>) {
      if (!voteCounts[v.showcase_id]) {
        voteCounts[v.showcase_id] = { best_demo: 0, most_innovative: 0, crowd_favorite: 0 };
      }
      const cat = v.category as keyof VoteCounts;
      if (cat && cat in voteCounts[v.showcase_id]) {
        voteCounts[v.showcase_id][cat]++;
      }
    }

    for (const v of ((myVotesRes as { data: Array<{ showcase_id: string; category: string }> | null }).data ?? []) as Array<{ showcase_id: string; category: string }>) {
      if (!myVoteMap[v.showcase_id]) myVoteMap[v.showcase_id] = [];
      if (v.category) myVoteMap[v.showcase_id].push(v.category);
    }
  }

  // Attach per-category vote counts to each showcase
  const enrichedSlots = allSlots.map(s => ({
    ...s,
    vote_counts: voteCounts[s.id as string] ?? { best_demo: 0, most_innovative: 0, crowd_favorite: 0 },
  }));

  // Identify which showcases belong to the current member
  const myMemberShowcaseIds = memberId
    ? allSlots.filter(s => s.member_id === memberId).map(s => s.id as string)
    : [];

  const isEnded = event.status === 'archived' || new Date(event.starts_at as string) < new Date();

  return (
    <div className="min-h-screen" style={{ background: '#0d1117', color: '#e2e8f0' }}>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-1">{event.title as string}</h1>
        <p className="text-sm font-semibold uppercase tracking-wider mb-8" style={{ color: '#38bdf8' }}>
          Demo Day
        </p>
        <DemoBoard
          eventId={event.id as string}
          eventSlug={params.slug}
          slots={enrichedSlots as any}
          myVoteMap={myVoteMap}
          memberId={memberId}
          myMemberShowcaseIds={myMemberShowcaseIds}
          isEnded={isEnded}
        />
      </div>
    </div>
  );
}
