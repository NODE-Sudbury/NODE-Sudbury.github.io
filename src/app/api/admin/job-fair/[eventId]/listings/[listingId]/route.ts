export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function boardCheck(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('members').select('role').eq('user_id', user.id).single();
  return data?.role === 'board' || data?.role === 'admin';
}

export async function DELETE(_req: Request, { params }: { params: { eventId: string; listingId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  if (!await boardCheck(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase.from('job_fair_listings').delete().eq('id', params.listingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
