export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UnconferenceAdmin } from './UnconferenceAdmin';

export default async function UnconferenceAdminPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: member } = await supabase.from('members').select('role').eq('id', user.id).single();
  if (member?.role !== 'board') redirect('/dashboard');

  const { data: event } = await supabase.from('events').select('id, title').eq('id', params.eventId).single();
  const { data: sessions } = await supabase
    .from('unconference_sessions')
    .select('*, proposer:proposed_by(display_name)')
    .eq('event_id', params.eventId)
    .order('dot_votes', { ascending: false });

  return <UnconferenceAdmin event={event} sessions={sessions ?? []} />;
}
