import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { badgeId: string; memberId: string } }
) {
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

  const { data: row } = await supabase
    .from('member_badges')
    .select('id, awarded_at, member_id, badge_id, badge_definitions(name, description, icon_url)')
    .eq('badge_id', params.badgeId)
    .eq('member_id', params.memberId)
    .single()

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    new URL(req.url).origin

  const assertionId = `${siteUrl}/api/badges/${params.badgeId}/assertion/${params.memberId}`

  const badge = row.badge_definitions as unknown as {
    name: string
    description: string
    icon_url: string | null
  } | null

  const credential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    ],
    id: assertionId,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: {
      id: siteUrl,
      type: 'Profile',
      name: 'NODE - Northern Ontario Dev Exchange',
      url: siteUrl,
      email: 'hello@nodesudbury.com',
    },
    issuanceDate: row.awarded_at,
    credentialSubject: {
      id: `${siteUrl}/profile/${params.memberId}`,
      type: 'AchievementSubject',
      achievement: {
        id: `${siteUrl}/api/badges/${params.badgeId}`,
        type: 'Achievement',
        name: badge?.name ?? 'NODE Badge',
        description: badge?.description ?? '',
        image: badge?.icon_url ?? undefined,
        criteria: {
          narrative: 'Awarded by NODE Sudbury community platform.',
        },
      },
    },
  }

  return NextResponse.json(credential, {
    headers: { 'Content-Type': 'application/vc+ld+json' },
  })
}
