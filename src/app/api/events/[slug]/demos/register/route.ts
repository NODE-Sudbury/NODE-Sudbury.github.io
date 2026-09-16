export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

  const { data: event } = await supabase
    .from('events').select('id').eq('slug', params.slug).single();
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const body = await req.json();
  const { project_name, pitch, demo_url, repo_url } = body;

  if (!project_name || !String(project_name).trim()) {
    return NextResponse.json({ error: 'project_name is required' }, { status: 400 });
  }
  if (!pitch || !String(pitch).trim()) {
    return NextResponse.json({ error: 'pitch is required' }, { status: 400 });
  }

  const insertPayload: Record<string, unknown> = {
    event_id: event.id,
    member_id: member.id,
    title: String(project_name).trim(),
    tagline: String(pitch).trim(),
    demo_url: demo_url || null,
    category: 'other',
    status: 'pending',
    slot_order: 0,
    vote_count: 0,
  };

  // repo_url may or may not exist as a column - pass it and let the DB handle it
  if (repo_url) insertPayload.repo_url = repo_url;

  const { data, error } = await supabase
    .from('demo_day_showcases')
    .insert(insertPayload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
