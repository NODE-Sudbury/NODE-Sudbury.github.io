export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DemoAdmin } from './DemoAdmin';

export default async function DemoAdminPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: member } = await supabase.from('members').select('role').eq('id', user.id).single();
  if (member?.role !== 'board') redirect('/dashboard');

  const { data: slots } = await supabase
    .from('demo_day_showcases')
    .select('*, members(display_name)')
    .eq('event_id', params.eventId)
    .order('slot_order', { ascending: true });

  return <DemoAdmin eventId={params.eventId} initialSlots={slots ?? []} />;
}
