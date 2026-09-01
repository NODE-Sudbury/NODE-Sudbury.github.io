export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { JobFairClient } from './JobFairClient';

export default async function JobFairPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug')
    .eq('slug', params.slug)
    .single();

  if (!event) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: booths }, { data: meetings }] = await Promise.all([
    supabase
      .from('job_fair_booths')
      .select('*, job_fair_listings(*)')
      .eq('event_id', event.id)
      .order('booth_number'),
    user
      ? supabase
          .from('job_fair_meetings')
          .select('*, job_fair_booths(company_name, booth_number, logo_url)')
          .eq('event_id', event.id)
          .order('time_slot')
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <JobFairClient
      event={event}
      booths={booths ?? []}
      myMeetings={meetings ?? []}
      isAuthenticated={!!user}
    />
  );
}
