import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
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

  const { data: logs } = await supabase
    .from('logs_intake')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const { data: workouts } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: true })

  const { data: weights } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: true })

  let csv = 'TYPE,DATE,NAME,CALORIES,PROTEIN,CARBS,FAT,WATER_ML,NOTES\n'

  logs?.forEach(log => {
    csv += `food,${log.created_at},${log.display_name},${log.macros?.calories || 0},${log.macros?.protein || 0},${log.macros?.carbs || 0},${log.macros?.fat || 0},${log.macros?.water_ml || 0},\n`
  })

  workouts?.forEach(w => {
    const notes = w.type === 'strength'
      ? w.data?.sets?.map((s: any) => `${s.reps}x${s.weight}kg`).join(' ')
      : `${w.data?.duration_mins}mins ${w.data?.distance_km ? w.data.distance_km + 'km' : ''}`
    csv += `workout,${w.logged_at},${w.name},,,,,,"${notes}"\n`
  })

  weights?.forEach(w => {
    csv += `weight,${w.logged_at},Weight Log,,,,,,"${w.weight}kg ${w.note || ''}"\n`
  })

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="aurahealth-export.csv"',
    },
  })
}