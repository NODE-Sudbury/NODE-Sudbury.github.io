export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const VALID_CATEGORIES = ['best_demo', 'most_innovative', 'crowd_favorite'] as const;
type VoteCategory = typeof VALID_CATEGORIES[number];

interface VoteCounts {
  best_demo: number;
  most_innovative: number;
  crowd_favorite: number;
}

function makeClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = makeClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('members').select('id').eq('user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const body = await req.json();
  const { showcase_id, category } = body;

  if (!showcase_id || !category) {
    return NextResponse.json({ error: 'showcase_id and category are required' }, { status: 400 });
  }
  if (!(VALID_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json(
      { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 }
    );
  }

  // Verify the showcase belongs to the right event (via slug)
  const { data: showcase } = await supabase
    .from('demo_day_showcases')
    .select('id, event_id, events!inner(slug)')
    .eq('id', showcase_id)
    .single();

  if (!showcase) return NextResponse.json({ error: 'Showcase not found' }, { status: 404 });

  const eventSlug = (showcase as any).events?.slug;
  if (eventSlug && eventSlug !== params.slug) {
    return NextResponse.json({ error: 'Showcase does not belong to this event' }, { status: 403 });
  }

  // Check if vote already exists for this member + showcase + category
  const { data: existing } = await supabase
    .from('demo_day_votes')
    .select('id')
    .eq('showcase_id', showcase_id)
    .eq('member_id', member.id)
    .eq('category', category)
    .maybeSingle();

  let voted: boolean;

  if (existing) {
    // Toggle off
    const { error: delErr } = await supabase
      .from('demo_day_votes')
      .delete()
      .eq('id', existing.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    voted = false;
  } else {
    // Toggle on
    const { error: insErr } = await supabase
      .from('demo_day_votes')
      .insert({ showcase_id, member_id: member.id, category });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
    voted = true;
  }

  // Fetch updated counts for this showcase
  const { data: votes } = await supabase
    .from('demo_day_votes')
    .select('category')
    .eq('showcase_id', showcase_id);

  const counts: VoteCounts = { best_demo: 0, most_innovative: 0, crowd_favorite: 0 };
  for (const v of votes ?? []) {
    const cat = v.category as VoteCategory;
    if (cat && cat in counts) counts[cat]++;
  }

  return NextResponse.json({ voted, counts });
}
