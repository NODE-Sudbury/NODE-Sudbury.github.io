import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const boothId = req.nextUrl.searchParams.get('booth_id');
  if (!boothId) {
    return NextResponse.json({ error: 'booth_id required' }, { status: 400 });
  }

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const { data: slots, error } = await supabase
    .from('job_fair_meeting_slots')
    .select(`
      id,
      starts_at,
      booked_by_member_id,
      booked_at,
      created_at,
      members:booked_by_member_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('booth_id', boothId)
    .eq('event_id', event.id)
    .order('starts_at');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mask booked_by details for non-admin viewers - only expose whether slot is taken
  const { data: { user } } = await supabase.auth.getUser();

  const sanitised = (slots ?? []).map((s: Record<string, unknown>) => {
    const isBooked = !!s.booked_by_member_id;
    // Only expose member details if the viewer is the booth admin or the booked member
    const canSeeDetails = user && (
      (s.members as Record<string, unknown> | null)?.id === user.id
    );
    return {
      id: s.id,
      starts_at: s.starts_at,
      booked_at: s.booked_at,
      created_at: s.created_at,
      is_available: !isBooked,
      booked_by: canSeeDetails ? s.members : (isBooked ? { hidden: true } : null),
    };
  });

  return NextResponse.json({ slots: sanitised });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { starts_at, booth_id } = body as { starts_at?: string; booth_id?: string };

  if (!starts_at || !booth_id) {
    return NextResponse.json({ error: 'starts_at and booth_id are required' }, { status: 400 });
  }

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const { data: booth } = await supabase
    .from('job_fair_booths')
    .select('id')
    .eq('id', booth_id)
    .eq('event_id', event.id)
    .single();

  if (!booth) {
    return NextResponse.json({ error: 'Booth not found for this event' }, { status: 404 });
  }

  // Prevent duplicate slots at the same time for the same booth
  const { data: existing } = await supabase
    .from('job_fair_meeting_slots')
    .select('id')
    .eq('booth_id', booth_id)
    .eq('event_id', event.id)
    .eq('starts_at', starts_at)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'A slot already exists at that time for this booth' }, { status: 409 });
  }

  const { data: slot, error } = await supabase
    .from('job_fair_meeting_slots')
    .insert({ booth_id, event_id: event.id, starts_at })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slot }, { status: 201 });
}
