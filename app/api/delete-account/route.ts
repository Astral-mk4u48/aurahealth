import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function DELETE() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await adminSupabase.from('logs_intake').delete().eq('user_id', user.id)
  await adminSupabase.from('workout_logs').delete().eq('user_id', user.id)
  await adminSupabase.from('weight_logs').delete().eq('user_id', user.id)
  await adminSupabase.from('user_favorites').delete().eq('user_id', user.id)
  await adminSupabase.from('group_members').delete().eq('user_id', user.id)
  await adminSupabase.from('workout_plans').delete().eq('user_id', user.id)
  await adminSupabase.from('profiles').delete().eq('id', user.id)
  await adminSupabase.auth.admin.deleteUser(user.id)

  return NextResponse.json({ success: true })
}