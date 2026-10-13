import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ChaptersAdmin from './ChaptersAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminChaptersPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('members').select('role').eq('id', user.id).single()
  if (member?.role !== 'board') redirect('/dashboard')

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, name, city, province, slug, description, website_url, logo_url, twitter_handle, instagram_handle, is_active')
    .order('created_at', { ascending: true })

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <ChaptersAdmin chapters={chapters ?? []} />
      </div>
    </>
  )
}
