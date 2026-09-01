export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data, error } = await supabase
    .from('unconference_sessions')
    .select('*, proposer:proposed_by(id, display_name)')
    .eq('event_id', params.eventId)
    .order('dot_votes', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('members').select('id').eq('user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const { data: event } = await supabase
    .from('events').select('type').eq('id', params.eventId).single();
  if (!event || event.type !== 'unconference') {
    return NextResponse.json({ error: 'Event is not an unconference' }, { status: 400 });
  }

  const body = await req.json();
  const { title, description, session_type } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const { data, error } = await supabase
    .from('unconference_sessions')
    .insert({ event_id: params.eventId, proposed_by: member.id, title: title.trim(), description, session_type: session_type ?? 'talk', status: 'proposed', dot_votes: 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
