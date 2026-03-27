'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Workouts() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [workouts, setWorkouts] = useState<any[]>([])
  const [tab, setTab] = useState<'log' | 'history'>('log')
  const [workoutType, setWorkoutType] = useState<'strength' | 'cardio'>('strength')
  const [exerciseName, setExerciseName] = useState('')
  const [sets, setSets] = useState([{ reps: '', weight: '' }])
  const [cardioType, setCardioType] = useState('')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchWorkouts(user.id)
      setLoading(false)
    }
    getData()
  }, [router])

  const fetchWorkouts = async (userId: string) => {
    const { data } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(30)
    if (data) setWorkouts(data)
  }

  const addSet = () => setSets(prev => [...prev, { reps: '', weight: '' }])
  const updateSet = (i: number, field: string, value: string) => {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }
  const removeSet = (i: number) => setSets(prev => prev.filter((_, idx) => idx !== i))

  const saveWorkout = async () => {
    if (!user) return
    setSaving(true)
    const workout = workoutType === 'strength' ? {
      user_id: user.id,
      type: 'strength',
      name: exerciseName,
      data: { sets: sets.filter(s => s.reps) },
    } : {
      user_id: user.id,
      type: 'cardio',
      name: cardioType,
      data: { duration_mins: parseInt(duration), distance_km: parseFloat(distance) || null },
    }
    await supabase.from('workout_logs').insert(workout)
    setExerciseName('')
    setSets([{ reps: '', weight: '' }])
    setCardioType('')
    setDuration('')
    setDistance('')
    await fetchWorkouts(user.id)
    setSaving(false)
    setTab('history')
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Workouts</h1>
          <p className="text-gray-400 mt-1">Log your training sessions</p>
        </div>

        <div className="flex bg-gray-900 rounded-xl p-1 w-fit">
          <button onClick={() => setTab('log')} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'log' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            + Log Workout
          </button>
          <button onClick={() => setTab('history')} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'history' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            History
          </button>
        </div>

        {tab === 'log' && (
          <div className="space-y-4">
            <div className="flex bg-gray-900 rounded-xl p-1 w-fit border border-gray-800">
              <button onClick={() => setWorkoutType('strength')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${workoutType === 'strength' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
                🏋️ Strength
              </button>
              <button onClick={() => setWorkoutType('cardio')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${workoutType === 'cardio' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
                🏃 Cardio
              </button>
            </div>

            {workoutType === 'strength' ? (
              <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-gray-400 text-sm">Exercise Name</label>
                  <input
                    type="text"
                    value={exerciseName}
                    onChange={e => setExerciseName(e.target.value)}
                    placeholder="e.g. Bench Press, Squat..."
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-400 text-sm">Sets</label>
                    <button onClick={addSet} className="text-green-400 text-sm hover:text-green-300">+ Add Set</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 px-1">
                    <span>Set</span>
                    <span>Reps</span>
                    <span>Weight (kg)</span>
                  </div>
                  {sets.map((set, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center">
                      <div className="bg-gray-800 rounded-lg px-3 py-2 text-center text-gray-400 text-sm">{i + 1}</div>
                      <input
                        type="number"
                        value={set.reps}
                        onChange={e => updateSet(i, 'reps', e.target.value)}
                        placeholder="12"
                        className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-green-500 text-sm"
                      />
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={set.weight}
                          onChange={e => updateSet(i, 'weight', e.target.value)}
                          placeholder="60"
                          className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-green-500 text-sm"
                        />
                        {sets.length > 1 && (
                          <button onClick={() => removeSet(i)} className="text-gray-600 hover:text-red-400 text-sm px-1">✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-gray-400 text-sm">Activity Type</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Running', 'Cycling', 'Swimming', 'Walking', 'Rowing', 'Other'].map(t => (
                      <button
                        key={t}
                        onClick={() => setCardioType(t)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${cardioType === t ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-gray-400 text-sm">Duration (minutes)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={e => setDuration(e.target.value)}
                      placeholder="30"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 text-sm">Distance (km) — optional</label>
                    <input
                      type="number"
                      value={distance}
                      onChange={e => setDistance(e.target.value)}
                      placeholder="5.0"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={saveWorkout}
              disabled={saving || (workoutType === 'strength' ? !exerciseName : !cardioType || !duration)}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-bold py-4 rounded-2xl transition-all"
            >
              {saving ? 'Saving...' : 'Save Workout'}
            </button>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            {workouts.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <div className="text-5xl mb-4">🏋️</div>
                <p className="text-xl">No workouts logged yet</p>
                <button onClick={() => setTab('log')} className="text-green-400 text-sm mt-2">Log your first workout →</button>
              </div>
            ) : workouts.map(workout => (
              <div key={workout.id} className="bg-gray-900 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{workout.type === 'strength' ? '🏋️' : '🏃'}</span>
                    <div>
                      <div className="font-bold">{workout.name}</div>
                      <div className="text-gray-500 text-sm">{new Date(workout.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400 capitalize">{workout.type}</span>
                </div>
                {workout.type === 'strength' && workout.data?.sets && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {workout.data.sets.map((set: any, i: number) => (
                      <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-center">
                        <div className="text-white font-semibold">{set.reps} × {set.weight}kg</div>
                        <div className="text-gray-500 text-xs">Set {i + 1}</div>
                      </div>
                    ))}
                  </div>
                )}
                {workout.type === 'cardio' && (
                  <div className="flex gap-4 text-sm">
                    <div className="bg-gray-800 rounded-lg px-4 py-2">
                      <span className="text-white font-semibold">{workout.data?.duration_mins} min</span>
                      <span className="text-gray-500 ml-1">duration</span>
                    </div>
                    {workout.data?.distance_km && (
                      <div className="bg-gray-800 rounded-lg px-4 py-2">
                        <span className="text-white font-semibold">{workout.data.distance_km} km</span>
                        <span className="text-gray-500 ml-1">distance</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}