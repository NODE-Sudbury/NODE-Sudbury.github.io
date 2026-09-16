export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const MAX_VOTES = 5;

async function getMember(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('members').select('id').eq('user_id', user.id).single();
  return data;
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const member = await getMember(supabase);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { session_id } = await req.json();
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  // Count existing votes this member has for this event
  const { count } = await supabase
    .from('unconference_votes')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', member.id)
    .in('session_id', supabase.from('unconference_sessions').select('id').eq('event_id', params.eventId) as unknown as string[]);

  if ((count ?? 0) >= MAX_VOTES) {
    return NextResponse.json({ error: `Maximum ${MAX_VOTES} dot votes per event` }, { status: 400 });
  }

  const { error: insertErr } = await supabase
    .from('unconference_votes')
    .insert({ session_id, member_id: member.id });

  if (insertErr) {
    if (insertErr.code === '23505') return NextResponse.json({ error: 'Already voted' }, { status: 409 });
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Increment dot_votes
  await supabase.rpc('increment_dot_votes', { p_session_id: session_id }).then(() => {});
  // Fallback direct update if rpc not available
  await supabase.from('unconference_sessions')
    .update({ dot_votes: supabase.rpc('dot_votes_for', { p_id: session_id }) as unknown as number })
    .eq('id', session_id);

  // Simple increment via raw update
  const { data: sess } = await supabase.from('unconference_sessions').select('dot_votes').eq('id', session_id).single();
  await supabase.from('unconference_sessions').update({ dot_votes: (sess?.dot_votes ?? 0) + 1 }).eq('id', session_id);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const member = await getMember(supabase);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { session_id } = await req.json();
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  const { error } = await supabase
    .from('unconference_votes')
    .delete()
    .eq('session_id', session_id)
    .eq('member_id', member.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Decrement dot_votes
  const { data: sess } = await supabase.from('unconference_sessions').select('dot_votes').eq('id', session_id).single();
  await supabase.from('unconference_sessions')
    .update({ dot_votes: Math.max(0, (sess?.dot_votes ?? 1) - 1) })
    .eq('id', session_id);

  return NextResponse.json({ success: true });
}
