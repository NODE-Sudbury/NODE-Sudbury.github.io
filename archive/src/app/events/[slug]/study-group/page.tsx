export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import StudyGroupHub from './StudyGroupHub';

export default async function StudyGroupPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: event } = await supabase
    .from('events').select('id, title, type').eq('slug', params.slug).single();
  if (!event) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  let member: { id: string } | null = null;
  if (user) {
    const { data } = await supabase.from('members').select('id').eq('user_id', user.id).single();
    member = data;
  }

  const [{ data: rawCohorts }, { data: myMembership }] = await Promise.all([
    supabase.from('study_group_cohorts')
      .select('*, study_group_members(count)')
      .eq('event_id', event.id)
      .order('created_at'),
    member
      ? supabase.from('study_group_members').select('cohort_id').eq('member_id', member.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const cohorts = (rawCohorts ?? []).map((c: any) => ({
    ...c,
    member_count: c.study_group_members?.[0]?.count ?? 0,
  }));

  const myCohortId = myMembership?.cohort_id ?? null;

  const [{ data: myProgress }, { data: cohortMembers }, { data: streakData }] = await Promise.all([
    member && myCohortId
      ? supabase.from('study_group_progress').select('week_number, completed').eq('cohort_id', myCohortId).eq('member_id', member.id)
      : Promise.resolve({ data: [] }),
    myCohortId
      ? supabase.from('study_group_members').select('member_id, members(display_name, avatar_url)').eq('cohort_id', myCohortId)
      : Promise.resolve({ data: [] }),
    member
      ? supabase.from('attendance_streaks').select('current_streak, longest_streak, last_event_date').eq('member_id', member.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="min-h-screen bg-gray-900 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-2">Study Groups</h1>
        <p className="text-gray-400 mb-8">{event.title}</p>
        <StudyGroupHub
          cohorts={cohorts}
          myMembership={myMembership ? { cohort_id: myMembership.cohort_id } : null}
          myProgress={myProgress ?? []}
          cohortMembers={(cohortMembers ?? []) as any}
          isLoggedIn={!!user}
          streak={streakData ?? undefined}
        />
      </div>
    </div>
  );
}
