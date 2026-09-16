import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'
import { TemplatesAdmin } from './TemplatesAdmin'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') redirect('/dashboard')

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[#f0e6d3]">Event Templates</h1>
          <p className="text-sm text-[#5a6278] mt-1">Clone events or reuse saved templates to create new events faster.</p>
        </div>
        <TemplatesAdmin />
      </div>
    </>
  )
}
