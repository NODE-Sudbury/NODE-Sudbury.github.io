import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = ['Best Art', 'Best Gameplay', 'Best Audio', 'Most Creative', 'Best Solo'];

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const entry_id: string | undefined = body.entry_id;
  const category: string | undefined = body.category;

  if (!entry_id || !category) {
    return NextResponse.json({ error: 'entry_id and category required' }, { status: 400 });
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
  }

  // Verify the entry exists and belongs to this event
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .eq('type', 'game_jam')
    .is('deleted_at', null)
    .single();

  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: entry } = await supabase
    .from('game_jam_entries')
    .select('id, member_id')
    .eq('id', entry_id)
    .eq('event_id', event.id)
    .single();

  if (!entry) return NextResponse.json({ error: 'entry_not_found' }, { status: 404 });

  // Cannot vote on your own entry
  if (entry.member_id === session.user.id) {
    return NextResponse.json({ error: 'cannot_vote_own_entry' }, { status: 403 });
  }

  // Check if vote already exists (toggle)
  const { data: existingVote } = await supabase
    .from('game_jam_votes')
    .select('id')
    .eq('entry_id', entry_id)
    .eq('member_id', session.user.id)
    .eq('category', category)
    .maybeSingle();

  let voted: boolean;

  if (existingVote) {
    // Remove vote
    const { error } = await supabase
      .from('game_jam_votes')
      .delete()
      .eq('id', existingVote.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    voted = false;
  } else {
    // Add vote
    const { error } = await supabase
      .from('game_jam_votes')
      .insert({ entry_id, member_id: session.user.id, category });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    voted = true;
  }

  // Return updated count
  const { count } = await supabase
    .from('game_jam_votes')
    .select('id', { count: 'exact', head: true })
    .eq('entry_id', entry_id)
    .eq('category', category);

  return NextResponse.json({ voted, count: count ?? 0 });
}
