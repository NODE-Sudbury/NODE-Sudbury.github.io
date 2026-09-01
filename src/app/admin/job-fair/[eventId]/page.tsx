export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { JobFairAdmin } from './JobFairAdmin';

export default async function JobFairAdminPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: member } = await supabase.from('members').select('role').eq('id', user.id).single();
  if (member?.role !== 'board' && member?.role !== 'admin') redirect('/dashboard');

  const { data: event } = await supabase.from('events').select('id, title').eq('id', params.eventId).single();
  const { data: booths } = await supabase
    .from('job_fair_booths')
    .select('*, job_fair_listings(*), job_fair_meetings(*)')
    .eq('event_id', params.eventId)
    .order('booth_number');

  return <JobFairAdmin eventId={params.eventId} eventTitle={event?.title ?? ''} initialBooths={booths ?? []} />;
}
