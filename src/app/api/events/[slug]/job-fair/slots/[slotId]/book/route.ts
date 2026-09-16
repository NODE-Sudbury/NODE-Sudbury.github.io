import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string; slotId: string } }
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

  // Resolve member record from auth user
  const { data: member } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: 'Member profile not found - please complete your profile first' }, { status: 404 });
  }

  // Verify event exists for slug
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Fetch the slot with booth info
  const { data: slot } = await supabase
    .from('job_fair_meeting_slots')
    .select(`
      id,
      starts_at,
      booked_by_member_id,
      event_id,
      booth_id,
      job_fair_booths (
        company_name,
        booth_number
      )
    `)
    .eq('id', params.slotId)
    .eq('event_id', event.id)
    .single();

  if (!slot) {
    return NextResponse.json({ error: 'Slot not found for this event' }, { status: 404 });
  }

  if (slot.booked_by_member_id) {
    // Let the requester know if they already own this booking
    if (slot.booked_by_member_id === member.id) {
      return NextResponse.json({ error: 'You have already booked this slot' }, { status: 409 });
    }
    return NextResponse.json({ error: 'This slot has already been booked' }, { status: 409 });
  }

  // Atomic update: only succeeds if booked_by_member_id is still null
  const { data: updated, error: updateError } = await supabase
    .from('job_fair_meeting_slots')
    .update({
      booked_by_member_id: member.id,
      booked_at: new Date().toISOString(),
    })
    .eq('id', params.slotId)
    .is('booked_by_member_id', null)
    .select(`
      id,
      starts_at,
      booked_at,
      job_fair_booths (
        company_name,
        booth_number
      )
    `)
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Slot was just booked by someone else - please choose another time' }, { status: 409 });
  }

  const boothRaw = updated.job_fair_booths as unknown
  const boothInfo = (Array.isArray(boothRaw) ? boothRaw[0] : boothRaw) as { company_name: string; booth_number: string | null } | null
  const company = boothInfo?.company_name ?? 'the company';
  const time = new Date(updated.starts_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Toronto',
  });

  return NextResponse.json({
    slot: updated,
    message: `Meeting booked with ${company} at ${time}`,
  });
}
