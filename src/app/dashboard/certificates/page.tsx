import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CertificatesClient from './CertificatesClient'

export const dynamic = 'force-dynamic'

export default async function CertificatesPage() {
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
    .eq('id', session.user.id)
    .single()

  if (!member) redirect('/login')

  const { data: certs } = await supabase
    .from('certificates')
    .select('id, cert_type, issued_at, metadata, event:events(title, slug, type, starts_at)')
    .eq('member_id', member.id)
    .order('issued_at', { ascending: false })

  type Cert = {
    id: string
    cert_type: string
    issued_at: string
    metadata: Record<string, unknown> | null
    event: { title: string; slug: string; type: string; starts_at: string } | null
  }

  return <CertificatesClient certs={(certs ?? []) as unknown as Cert[]} memberName={member.full_name ?? 'Member'} />
}
