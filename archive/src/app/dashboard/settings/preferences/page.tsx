import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PreferencesClient from './PreferencesClient'

export const dynamic = 'force-dynamic'

export default async function PreferencesPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('dietary_restrictions, tshirt_size')
    .eq('user_id', session.user.id)
    .single()

  return <PreferencesClient dietary={member?.dietary_restrictions ?? []} tshirt={member?.tshirt_size ?? ''} />
}
