export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import PublicProfile from './PublicProfile'

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: member } = await supabase
    .from('members')
    .select('id, full_name, avatar_url, member_type, job_title, company, school, program, linkedin_url, github_url, twitter_url, website_url, created_at, is_public')
    .eq('id', params.id)
    .eq('is_public', true)
    .single()

  return <PublicProfile member={member ?? null} />
}
