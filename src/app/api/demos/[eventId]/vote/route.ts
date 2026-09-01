export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function makeClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
}

async function getMemberId(supabase: ReturnType<typeof makeClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('members').select('id').eq('user_id', user.id).single();
  return data?.id ?? null;
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const supabase = makeClient();
  const memberId = await getMemberId(supabase);
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slot_id } = await req.json();
  if (!slot_id) return NextResponse.json({ error: 'slot_id required' }, { status: 400 });

  // Get all showcase ids for this event to check vote count
  const { data: showcases } = await supabase
    .from('demo_day_showcases').select('id').eq('event_id', params.eventId);
  const showcaseIds = (showcases ?? []).map((s: { id: string }) => s.id);

  const { count } = await supabase
    .from('demo_day_votes')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .in('showcase_id', showcaseIds);

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'You have used all 3 votes for this event' }, { status: 400 });
  }

  const { error: voteError } = await supabase
    .from('demo_day_votes').insert({ showcase_id: slot_id, member_id: memberId });
  if (voteError) return NextResponse.json({ error: voteError.message }, { status: 400 });

  const { data: showcase } = await supabase
    .from('demo_day_showcases').select('vote_count').eq('id', slot_id).single();
  if (showcase) {
    await supabase.from('demo_day_showcases')
      .update({ vote_count: (showcase.vote_count ?? 0) + 1 }).eq('id', slot_id);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params: _params }: { params: { eventId: string } }) {
  const supabase = makeClient();
  const memberId = await getMemberId(supabase);
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slot_id } = await req.json();
  const { error } = await supabase
    .from('demo_day_votes').delete().eq('showcase_id', slot_id).eq('member_id', memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: showcase } = await supabase
    .from('demo_day_showcases').select('vote_count').eq('id', slot_id).single();
  if (showcase && (showcase.vote_count ?? 0) > 0) {
    await supabase.from('demo_day_showcases')
      .update({ vote_count: showcase.vote_count - 1 }).eq('id', slot_id);
  }

  return NextResponse.json({ success: true });
}
