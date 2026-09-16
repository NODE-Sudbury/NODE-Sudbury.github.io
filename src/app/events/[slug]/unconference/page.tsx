export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { UnconferenceBoard } from './UnconferenceBoard';

export default async function UnconferencePage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: event } = await supabase
    .from('events')
    .select('id, title, type, status')
    .eq('slug', params.slug)
    .single();

  if (!event || event.type !== 'unconference') notFound();

  const { data: { user } } = await supabase.auth.getUser();

  let memberId: string | null = null;
  let memberVotes: string[] = [];

  if (user) {
    const { data: member } = await supabase
      .from('members').select('id').eq('user_id', user.id).single();
    if (member) {
      memberId = member.id;
      const { data: votes } = await supabase
        .from('unconference_votes')
        .select('session_id')
        .eq('member_id', member.id)
        .in('session_id',
          supabase.from('unconference_sessions').select('id').eq('event_id', event.id) as unknown as string[]
        );
      memberVotes = (votes ?? []).map((v: { session_id: string }) => v.session_id);
    }
  }

  const { data: sessions } = await supabase
    .from('unconference_sessions')
    .select('*, proposer:proposed_by(id, display_name)')
    .eq('event_id', event.id)
    .order('dot_votes', { ascending: false });

  return (
    <UnconferenceBoard
      event={event}
      sessions={sessions ?? []}
      memberId={memberId}
      memberVotes={memberVotes}
    />
  );
}
