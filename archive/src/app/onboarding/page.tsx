export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { OnboardingWizard } from './OnboardingWizard'

export default async function OnboardingPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // If already completed, skip to dashboard
  const { data: onboarding } = await supabase
    .from('member_onboarding_state')
    .select('completed_at')
    .eq('member_id', session.user.id)
    .single()

  if (onboarding?.completed_at) redirect('/dashboard')

  const { data: member } = await supabase
    .from('members')
    .select('full_name, bio, interests')
    .eq('id', session.user.id)
    .single()

  return (
    <OnboardingWizard
      initialName={member?.full_name ?? ''}
      initialBio={member?.bio ?? ''}
      initialInterests={(member?.interests as string[]) ?? []}
    />
  )
}
