export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import StudyGroupAdmin from './StudyGroupAdmin';

export default async function StudyGroupAdminPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: member } = await supabase.from('members').select('role').eq('id', user.id).single();
  if (member?.role !== 'board') notFound();

  const { data: cohorts } = await supabase
    .from('study_group_cohorts')
    .select('*, study_group_members(count)')
    .eq('event_id', params.eventId)
    .order('created_at');

  return (
    <div className="min-h-screen bg-gray-900 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-8">Study Group Admin</h1>
        <StudyGroupAdmin eventId={params.eventId} initialCohorts={cohorts ?? []} />
      </div>
    </div>
  );
}
