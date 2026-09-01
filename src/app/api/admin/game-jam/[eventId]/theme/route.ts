import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { createServiceClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getBoardClient() {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return { session: null, serviceClient: null };

  const { data: member } = await authClient
    .from('members')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const isBoard = ['board', 'admin', 'super_admin'].includes(member?.role ?? '');
  if (!isBoard) return { session, serviceClient: null };

  return { session, serviceClient: createServiceClient() };
}

// POST { theme } - reveal a new theme (deactivates all existing, inserts new active one)
export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  const { session, serviceClient } = await getBoardClient();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!serviceClient) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data: event } = await serviceClient
    .from('events')
    .select('id')
    .eq('id', params.eventId)
    .eq('type', 'game_jam')
    .is('deleted_at', null)
    .single();

  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await request.json();
  const theme = (body.theme ?? '').toString().trim();
  if (!theme) return NextResponse.json({ error: 'theme_required' }, { status: 400 });

  // Deactivate all existing themes for this event
  await serviceClient
    .from('game_jam_themes')
    .update({ is_active: false })
    .eq('event_id', event.id);

  // Insert new active theme
  const { data: inserted, error } = await serviceClient
    .from('game_jam_themes')
    .insert({
      event_id: event.id,
      theme,
      revealed_at: new Date().toISOString(),
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ theme: inserted }, { status: 201 });
}

// PATCH { theme } - update the text of the currently active theme
export async function PATCH(request: Request, { params }: { params: { eventId: string } }) {
  const { session, serviceClient } = await getBoardClient();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!serviceClient) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data: event } = await serviceClient
    .from('events')
    .select('id')
    .eq('id', params.eventId)
    .eq('type', 'game_jam')
    .is('deleted_at', null)
    .single();

  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await request.json();
  const theme = (body.theme ?? '').toString().trim();
  if (!theme) return NextResponse.json({ error: 'theme_required' }, { status: 400 });

  const { data: existing } = await serviceClient
    .from('game_jam_themes')
    .select('id')
    .eq('event_id', event.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'no_active_theme' }, { status: 404 });

  const { data: updated, error } = await serviceClient
    .from('game_jam_themes')
    .update({ theme })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ theme: updated });
}
