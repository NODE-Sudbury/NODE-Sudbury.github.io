export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function getMember(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('members').select('id').eq('user_id', user.id).single();
  return data;
}

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const member = await getMember(supabase);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('job_fair_meetings')
    .select('*, job_fair_booths(company_name, booth_number, logo_url)')
    .eq('event_id', params.eventId)
    .eq('member_id', member.id)
    .order('time_slot');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const member = await getMember(supabase);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { booth_id, time_slot, notes } = await req.json();
  if (!booth_id || !time_slot) return NextResponse.json({ error: 'booth_id and time_slot required' }, { status: 400 });

  const { data, error } = await supabase
    .from('job_fair_meetings')
    .insert({ booth_id, member_id: member.id, event_id: params.eventId, time_slot, notes, status: 'requested' })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That time slot is already booked' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
