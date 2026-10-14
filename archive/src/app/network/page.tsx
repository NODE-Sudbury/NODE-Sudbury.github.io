import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import NetworkClient from './NetworkClient'

export const dynamic = 'force-dynamic'

export default async function NetworkPage() {
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
    .select('id, full_name')
    .eq('user_id', session.user.id)
    .single()

  if (!member) redirect('/login')

  const [{ data: myProfile }, { data: visibleMembers }, { data: connections }] = await Promise.all([
    supabase
      .from('networking_profiles')
      .select('is_visible, bio, skills, linkedin_url, github_url')
      .eq('member_id', member.id)
      .maybeSingle(),
    supabase
      .from('networking_profiles')
      .select('member_id, bio, skills, linkedin_url, github_url, member:members(id, full_name, avatar_url, job_title, company, member_type)')
      .eq('is_visible', true)
      .neq('member_id', member.id),
    supabase
      .from('member_connections')
      .select('id, from_member_id, to_member_id, status, message, created_at')
      .or(`from_member_id.eq.${member.id},to_member_id.eq.${member.id}`),
  ])

  type MemberProfile = {
    member_id: string
    bio: string | null
    skills: string[] | null
    linkedin_url: string | null
    github_url: string | null
    member: {
      id: string
      full_name: string | null
      avatar_url: string | null
      job_title: string | null
      company: string | null
      member_type: string | null
    } | null
  }

  return (
    <NetworkClient
      myMemberId={member.id}
      myProfile={myProfile}
      visibleMembers={(visibleMembers ?? []) as unknown as MemberProfile[]}
      connections={connections ?? []}
    />
  )
}
