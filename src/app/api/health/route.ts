import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return Response.json(
      { status: 'error', error: 'Supabase env vars not configured' },
      { status: 500 }
    )
  }

  try {
    const supabase = createClient(url, key)
    const { error } = await supabase.from('members').select('count').limit(1)

    if (error && error.code !== 'PGRST116') {
      return Response.json(
        { status: 'error', error: error.message, project: url },
        { status: 500 }
      )
    }

    return Response.json({
      status: 'ok',
      project: url,
      env: process.env.VERCEL_ENV ?? 'local',
    })
  } catch (err) {
    return Response.json(
      { status: 'error', error: 'Supabase connection failed' },
      { status: 500 }
    )
  }
}
