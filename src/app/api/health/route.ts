import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { error } = await supabase.from('members').select('count').limit(1)

    if (error && error.code !== 'PGRST116') {
      return Response.json(
        { status: 'error', error: error.message, project: process.env.NEXT_PUBLIC_SUPABASE_URL },
        { status: 500 }
      )
    }

    return Response.json({
      status: 'ok',
      project: process.env.NEXT_PUBLIC_SUPABASE_URL,
      env: process.env.VERCEL_ENV ?? 'local',
    })
  } catch (err) {
    return Response.json(
      { status: 'error', error: 'Supabase client failed to initialize' },
      { status: 500 }
    )
  }
}
