'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function WorkoutPlan() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile) { router.push('/onboarding'); return }
      setUser(user)
      setProfile(profile)

      const { data: workouts } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(10)
      if (workouts) setRecentWorkouts(workouts)

      const { data: savedPlan } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (savedPlan) setPlan(savedPlan.plan)

      setLoading(false)
    }
    getData()
  }, [router])

  const generatePlan = async () => {
    setGenerating(true)
    const name = user?.user_metadata?.full_name?.split(' ')[0] || profile?.username
    const res = await fetch('/api/workout-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        recentWorkouts,
        muscleFocus: profile?.muscle_focus || [],
        goal: profile?.goals?.goal_type,
        fitnessLevel: profile?.fitness_level,
      })
    })
    const data = await res.json()
    setPlan(data)
    await supabase.from('workout_plans').insert({
      user_id: user.id,
      plan: data,
      focus_muscles: profile?.muscle_focus || [],
    })
    setGenerating(false)
  }

  const intensityColor = (intensity: string) => {
    if (intensity === 'High') return 'text-red-400 bg-red-900/30'
    if (intensity === 'Medium') return 'text-yellow-400 bg-yellow-900/30'
    return 'text-green-400 bg-green-900/30'
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Workout Plan</h1>
          <p className="text-gray-400 mt-1">AI-generated plan based on your goals and history</p>
        </div>

        {profile?.muscle_focus?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-gray-400 text-sm">Focusing on:</span>
            {profile.muscle_focus.map((m: string) => (
              <span key={m} className="bg-green-900 text-green-400 text-xs px-3 py-1 rounded-full capitalize">{m}</span>
            ))}
          </div>
        )}

        {plan ? (
          <div className="space-y-4">
            {plan.weeklyGoal && (
              <div className="bg-gray-900 rounded-2xl p-5 border border-green-900">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-semibold text-sm">Weekly Goal</span>
                </div>
                <p className="text-gray-300">{plan.weeklyGoal}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {plan.weekPlan?.map((day: any, i: number) => (
                <div key={i} className="bg-gray-900 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{day.day}</h3>
                      <p className="text-gray-400 text-sm">{day.focus}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${intensityColor(day.intensity)}`}>
                        {day.intensity}
                      </span>
                      <span className="text-gray-500 text-xs">{day.estimatedTime}</span>
                    </div>
                  </div>
                  {day.exercises ? (
                    <div className="space-y-2">
                      {day.exercises.map((ex: any, j: number) => (
                        <div key={j} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                          <span className="font-medium text-sm">{ex.name}</span>
                          <div className="flex gap-3 text-sm text-gray-400">
                            <span>{ex.sets} sets</span>
                            <span>{ex.reps} reps</span>
                            <span className="text-gray-600">{ex.rest}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-800 rounded-xl px-4 py-3 text-gray-400 text-sm">{day.focus}</div>
                  )}
                </div>
              ))}
            </div>

            {plan.tips && (
              <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold">💡 Tips for this week</h3>
                {plan.tips.map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={generatePlan}
              disabled={generating}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 rounded-2xl transition-all"
            >
              {generating ? 'Generating new plan...' : '🔄 Regenerate Plan'}
            </button>
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">🏋️</div>
            <h2 className="text-2xl font-bold">No plan yet</h2>
            <p className="text-gray-400">Generate a personalized weekly workout plan based on your goals and history</p>
            <button
              onClick={generatePlan}
              disabled={generating}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold px-8 py-4 rounded-2xl transition-all text-lg"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  Generating your plan...
                </span>
              ) : '✨ Generate My Workout Plan'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}