export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function getBoard(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('members').select('id, role').eq('user_id', user.id).single();
  return data?.role === 'board' ? data : null;
}

export async function PATCH(req: Request, { params }: { params: { eventId: string; cohortId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const board = await getBoard(supabase);
  if (!board) return NextResponse.json({ error: 'Board only' }, { status: 403 });

  const body = await req.json();
  const { data, error } = await supabase
    .from('study_group_cohorts')
    .update(body)
    .eq('id', params.cohortId)
    .eq('event_id', params.eventId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { eventId: string; cohortId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const board = await getBoard(supabase);
  if (!board) return NextResponse.json({ error: 'Board only' }, { status: 403 });

  const { error } = await supabase
    .from('study_group_cohorts')
    .delete()
    .eq('id', params.cohortId)
    .eq('event_id', params.eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
