export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: { cohortId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('members').select('id').eq('user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const { week_number, completed, notes } = await req.json();
  if (typeof week_number !== 'number') {
    return NextResponse.json({ error: 'week_number required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('study_group_progress')
    .upsert({
      cohort_id: params.cohortId,
      member_id: member.id,
      week_number,
      completed: !!completed,
      notes: notes ?? null,
      completed_at: completed ? new Date().toISOString() : null,
    }, { onConflict: 'cohort_id,member_id,week_number' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
