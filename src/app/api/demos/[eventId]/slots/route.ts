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

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = makeClient();
  const { data, error } = await supabase
    .from('demo_day_showcases')
    .select('*, members(display_name, avatar_url)')
    .eq('event_id', params.eventId)
    .eq('status', 'confirmed')
    .order('slot_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = makeClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('members').select('id').eq('user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const body = await req.json();
  const { project_name, tagline, description, category, demo_url, slides_url, video_url } = body;
  if (!project_name) return NextResponse.json({ error: 'project_name required' }, { status: 400 });

  const { data, error } = await supabase
    .from('demo_day_showcases')
    .insert({ event_id: params.eventId, member_id: member.id, title: project_name, tagline, description, category: category ?? 'other', demo_url, slides_url, video_url, status: 'pending', slot_order: 0 })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
