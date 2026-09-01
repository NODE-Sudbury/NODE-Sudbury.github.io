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

  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('slug', params.slug)
    .eq('type', 'game_jam')
    .is('deleted_at', null)
    .single();

  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Verify the user is registered for this event
  const { data: registration } = await supabase
    .from('registrations')
    .select('id')
    .eq('event_id', event.id)
    .eq('member_id', session.user.id)
    .maybeSingle();

  if (!registration) {
    return NextResponse.json({ error: 'not_registered' }, { status: 403 });
  }

  const body = await request.json();

  const title = (body.title ?? '').toString().trim();
  if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 });

  const description = (body.description ?? '').toString().slice(0, 500);
  const play_url = (body.play_url ?? '').toString().trim() || null;
  const repo_url = (body.repo_url ?? '').toString().trim() || null;
  const screenshot_url = (body.screenshot_url ?? '').toString().trim() || null;
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c: unknown) => typeof c === 'string' && ALLOWED_CATEGORIES.includes(c as string))
    : [];

  // Check if entry already exists for this user + event
  const { data: existing } = await supabase
    .from('game_jam_entries')
    .select('id')
    .eq('event_id', event.id)
    .eq('member_id', session.user.id)
    .maybeSingle();

  let entry;
  if (existing) {
    const { data: updated, error } = await supabase
      .from('game_jam_entries')
      .update({ title, description, play_url, repo_url, screenshot_url, categories })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    entry = updated;
  } else {
    const { data: inserted, error } = await supabase
      .from('game_jam_entries')
      .insert({
        event_id: event.id,
        member_id: session.user.id,
        title,
        description,
        play_url,
        repo_url,
        screenshot_url,
        categories,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    entry = inserted;
  }

  return NextResponse.json({ entry }, { status: 200 });
}
