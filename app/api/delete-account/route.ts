import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
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
  await adminSupabase.from('group_messages').delete().eq('user_id', user.id)
  await adminSupabase.from('profiles').delete().eq('id', user.id)
  await adminSupabase.auth.admin.deleteUser(user.id)

  return NextResponse.json({ success: true })
}