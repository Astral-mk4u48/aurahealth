import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
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

  const [{ data: logs }, { data: workouts }, { data: weights }] = await Promise.all([
    supabase.from('logs_intake').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('workout_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: true }),
    supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: true }),
  ])

  let csv = 'TYPE,DATE,NAME,CALORIES,PROTEIN,CARBS,FAT,WATER_ML,NOTES\n'
  logs?.forEach(log => {
    csv += `${log.entry_type},${log.created_at},"${log.display_name}",${log.macros?.calories || 0},${log.macros?.protein || 0},${log.macros?.carbs || 0},${log.macros?.fat || 0},${log.macros?.water_ml || 0},\n`
  })
  workouts?.forEach(w => {
    const notes = w.type === 'strength'
      ? w.data?.sets?.map((s: any) => `${s.reps}x${s.weight}kg`).join(' ')
      : `${w.data?.duration_mins}mins${w.data?.distance_km ? ' ' + w.data.distance_km + 'km' : ''}`
    csv += `workout,${w.logged_at},"${w.name}",,,,,,"${notes || ''}"\n`
  })
  weights?.forEach(w => {
    csv += `weight,${w.logged_at},"Weight Log",,,,,,"${w.weight}kg${w.note ? ' - ' + w.note : ''}"\n`
  })

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="aurahealth-export.csv"',
    },
  })
}