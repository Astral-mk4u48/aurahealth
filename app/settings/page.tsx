'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Settings() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    username: '',
    age: '',
    gender: 'male',
    height: '',
    weight: '',
    activity: 'moderate',
    goal: 'maintain',
  })
  const router = useRouter()

  const activityLevels = [
    { id: 'sedentary', label: 'Sedentary', multiplier: 1.2 },
    { id: 'light', label: 'Lightly Active', multiplier: 1.375 },
    { id: 'moderate', label: 'Moderately Active', multiplier: 1.55 },
    { id: 'very', label: 'Very Active', multiplier: 1.725 },
    { id: 'athlete', label: 'Athlete', multiplier: 1.9 },
  ]

  const goals = [
    { id: 'lose', label: 'Lose Fat', adjustment: -500 },
    { id: 'maintain', label: 'Maintain', adjustment: 0 },
    { id: 'gain', label: 'Build Muscle', adjustment: 300 },
  ]

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (!profile) { router.push('/onboarding'); return }
      setUser(user)
      setForm({
        username: profile.username || '',
        age: profile.age?.toString() || '',
        gender: profile.gender || 'male',
        height: profile.height?.toString() || '',
        weight: profile.weight?.toString() || '',
        activity: profile.goals?.activity || 'moderate',
        goal: profile.goals?.goal_type || 'maintain',
      })
      setLoading(false)
    }
    getUser()
  }, [router])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const w = parseFloat(form.weight)
    const h = parseFloat(form.height)
    const a = parseFloat(form.age)
    const bmr = form.gender === 'male'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161
    const multiplier = activityLevels.find(l => l.id === form.activity)?.multiplier || 1.55
    const tdee = Math.round(bmr * multiplier)
    const adjustment = goals.find(g => g.id === form.goal)?.adjustment || 0
    const dailyCalories = tdee + adjustment
    const proteinTarget = form.goal === 'gain' ? Math.round(w * 2.2) : Math.round(w * 1.8)

    await supabase.from('profiles').upsert({
      id: user.id,
      username: form.username,
      age: parseInt(form.age),
      gender: form.gender,
      height: parseFloat(form.height),
      weight: parseFloat(form.weight),
      fitness_level: 'Beginner',
      goals: {
        goal_type: form.goal,
        activity: form.activity,
        daily_calories: dailyCalories,
        protein_target: proteinTarget,
        water_target_ml: 2500,
      },
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Settings</h1>
          <p className="text-gray-400 mt-1">Update your profile and goals</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Personal Info</h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-gray-400 text-sm">Display Name</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-gray-400 text-sm">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-gray-400 text-sm">Gender</label>
              <div className="flex gap-3">
                {['male', 'female'].map(g => (
                  <button
                    key={g}
                    onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className={`flex-1 py-3 rounded-xl font-semibold capitalize transition-all ${
                      form.gender === g ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-gray-400 text-sm">Height (cm)</label>
                <input
                  type="number"
                  value={form.height}
                  onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 text-sm">Weight (kg)</label>
                <input
                  type="number"
                  value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Activity Level</h2>
          <div className="space-y-2">
            {activityLevels.map(level => (
              <button
                key={level.id}
                onClick={() => setForm(f => ({ ...f, activity: level.id }))}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                  form.activity === level.id
                    ? 'bg-green-500 text-black font-semibold'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Goal</h2>
          <div className="space-y-2">
            {goals.map(goal => (
              <button
                key={goal.id}
                onClick={() => setForm(f => ({ ...f, goal: goal.id }))}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                  form.goal === goal.id
                    ? 'bg-green-500 text-black font-semibold'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {goal.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold py-4 rounded-2xl transition-all text-lg"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>

        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
          className="w-full bg-gray-900 hover:bg-gray-800 text-red-400 font-semibold py-4 rounded-2xl transition-all"
        >
          Sign Out
        </button>
      </div>
    </main>
  )
}