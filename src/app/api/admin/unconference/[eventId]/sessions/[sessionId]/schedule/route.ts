export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string; sessionId: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('members').select('is_board').eq('user_id', user.id).single();
  if (!member?.is_board) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { time_slot, room, status } = body;

  const updates: Record<string, unknown> = {};
  if (time_slot !== undefined) updates.time_slot = time_slot;
  if (room !== undefined) updates.room = room;
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from('unconference_sessions')
    .update(updates)
    .eq('id', params.sessionId)
    .eq('event_id', params.eventId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
