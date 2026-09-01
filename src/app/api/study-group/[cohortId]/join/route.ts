export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: { cohortId: string } }) {
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

  const { data: cohort } = await supabase
    .from('study_group_cohorts')
    .select('id, is_open, max_members')
    .eq('id', params.cohortId)
    .single();
  if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  if (!cohort.is_open) return NextResponse.json({ error: 'Cohort is closed' }, { status: 400 });

  const { count } = await supabase
    .from('study_group_members')
    .select('id', { count: 'exact', head: true })
    .eq('cohort_id', params.cohortId);
  if (cohort.max_members && (count ?? 0) >= cohort.max_members) {
    return NextResponse.json({ error: 'Cohort is full' }, { status: 400 });
  }

  const { error } = await supabase
    .from('study_group_members')
    .insert({ cohort_id: params.cohortId, member_id: member.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true }, { status: 201 });
}
