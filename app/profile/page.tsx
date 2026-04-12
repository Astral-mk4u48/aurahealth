'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [tab, setTab] = useState<'stats' | 'favorites' | 'settings' | 'data'>('stats')
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [newExercise, setNewExercise] = useState({ title: '', short_desc: '', difficulty: 'Beginner', equipment: 'None', muscles: '' })
  const [savingExercise, setSavingExercise] = useState(false)
  const [exerciseSaved, setExerciseSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    username: '', age: '', gender: 'male', height: '', weight: '', activity: 'moderate', goal: 'maintain',
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
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile) { router.push('/onboarding'); return }
      setUser(user)
      setProfile(profile)
      setForm({
        username: profile.username || '',
        age: profile.age?.toString() || '',
        gender: profile.gender || 'male',
        height: profile.height?.toString() || '',
        weight: profile.weight?.toString() || '',
        activity: profile.goals?.activity || 'moderate',
        goal: profile.goals?.goal_type || 'maintain',
      })
      const { data: favs } = await supabase
        .from('user_favorites')
        .select('*, content:content_id(*)')
        .eq('user_id', user.id)
        .order('date_saved', { ascending: false })
      if (favs) setFavorites(favs)
      setLoading(false)
    }
    getData()
  }, [router])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const w = parseFloat(form.weight)
    const h = parseFloat(form.height)
    const a = parseFloat(form.age)
    const bmr = form.gender === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161
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
      goals: { goal_type: form.goal, activity: form.activity, daily_calories: dailyCalories, protein_target: proteinTarget, water_target_ml: 2500 },
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const removeFavorite = async (contentId: string) => {
    await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('content_id', contentId)
    setFavorites(prev => prev.filter(f => f.content_id !== contentId))
  }

  const handleExport = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const res = await fetch('/api/export', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  })

  if (!res.ok) { alert('Export failed. Please try again.'); return }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'aurahealth-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setImporting(true)
    setImportMsg('')
    const text = await file.text()
    const lines = text.split('\n').slice(1).filter(l => l.trim())
    let imported = 0
    for (const line of lines) {
      const cols = line.split(',')
      const type = cols[0]?.trim()
      const date = cols[1]?.trim()
      const name = cols[2]?.trim()
      if (!type || !date || !name) continue
      if (type === 'food' || type === 'water') {
        await supabase.from('logs_intake').insert({
          user_id: user.id,
          entry_type: type,
          display_name: name,
          amount: 1,
          unit: 'serving',
          macros: {
            calories: parseFloat(cols[3]) || 0,
            protein: parseFloat(cols[4]) || 0,
            carbs: parseFloat(cols[5]) || 0,
            fat: parseFloat(cols[6]) || 0,
            water_ml: parseFloat(cols[7]) || 0,
          },
          is_ai_generated: false,
          created_at: date,
        })
        imported++
      } else if (type === 'weight') {
        const notes = cols[8]?.replace(/"/g, '').trim()
        const weight = parseFloat(notes?.split('kg')[0])
        if (weight) {
          await supabase.from('weight_logs').insert({
            user_id: user.id,
            weight,
            logged_at: date,
          })
          imported++
        }
      }
    }
    setImportMsg(`Successfully imported ${imported} entries!`)
    setImporting(false)
  }

  const saveCustomExercise = async () => {
    if (!newExercise.title.trim() || !user) return
    setSavingExercise(true)
    await supabase.from('library_content').insert({
      creator_id: user.id,
      type: 'exercise',
      title: newExercise.title,
      short_desc: newExercise.short_desc,
      long_content: `Difficulty: ${newExercise.difficulty}. Equipment: ${newExercise.equipment}.`,
      data_points: {
        difficulty: newExercise.difficulty,
        equipment: newExercise.equipment,
        muscle_groups: newExercise.muscles.split(',').map(m => m.trim()),
      },
      tags: [newExercise.muscles.split(',')[0]?.trim().toLowerCase() || 'custom'],
    })
    setNewExercise({ title: '', short_desc: '', difficulty: 'Beginner', equipment: 'None', muscles: '' })
    setSavingExercise(false)
    setExerciseSaved(true)
    setTimeout(() => setExerciseSaved(false), 3000)
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-black text-2xl font-bold">
            {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{profile?.username || 'User'}</h1>
            <p className="text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div className="flex bg-gray-900 rounded-xl p-1 gap-1 flex-wrap">
          {(['stats', 'favorites', 'settings', 'data'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}>
              {t === 'stats' ? '📊 Stats' : t === 'favorites' ? '⭐ Favorites' : t === 'settings' ? '⚙️ Settings' : '📁 Data'}
            </button>
          ))}
        </div>

        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-2xl p-5 space-y-1">
                <div className="text-gray-400 text-sm">Daily Calorie Target</div>
                <div className="text-2xl font-bold text-green-400">{profile?.goals?.daily_calories} kcal</div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 space-y-1">
                <div className="text-gray-400 text-sm">Protein Target</div>
                <div className="text-2xl font-bold text-blue-400">{profile?.goals?.protein_target}g</div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 space-y-1">
                <div className="text-gray-400 text-sm">Current Weight</div>
                <div className="text-2xl font-bold text-white">{profile?.weight}kg</div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 space-y-1">
                <div className="text-gray-400 text-sm">Goal</div>
                <div className="text-2xl font-bold text-white capitalize">
                  {profile?.goals?.goal_type === 'lose' ? 'Lose Fat' : profile?.goals?.goal_type === 'gain' ? 'Build Muscle' : 'Maintain'}
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
              <div className="text-gray-400 text-sm font-semibold uppercase tracking-wide">Body Stats</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-xl font-bold">{profile?.height}cm</div><div className="text-gray-500 text-sm">Height</div></div>
                <div><div className="text-xl font-bold">{profile?.weight}kg</div><div className="text-gray-500 text-sm">Weight</div></div>
                <div><div className="text-xl font-bold">{profile?.age}</div><div className="text-gray-500 text-sm">Age</div></div>
              </div>
            </div>
            {profile?.muscle_focus?.length > 0 && (
              <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
                <div className="text-gray-400 text-sm font-semibold uppercase tracking-wide">Muscle Focus</div>
                <div className="flex gap-2 flex-wrap">
                  {profile.muscle_focus.map((m: string) => (
                    <span key={m} className="bg-green-900 text-green-400 text-sm px-3 py-1 rounded-full">{m}</span>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
  className="w-full bg-gray-900 hover:bg-gray-800 text-red-400 font-semibold py-4 rounded-2xl transition-all border border-gray-800">
  Sign Out
</button>
<button
  onClick={async () => {
  if (!confirm('Are you sure? This will permanently delete your account and ALL your data. This cannot be undone.')) return
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/delete-account', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${session?.access_token}` }
  })
  if (res.ok) {
    await supabase.auth.signOut()
    router.push('/login')
  } else {
    alert('Failed to delete account. Please try again.')
  }
}}
  className="w-full bg-red-950 hover:bg-red-900 text-red-400 font-semibold py-4 rounded-2xl transition-all border border-red-900 text-sm"
>
  Delete Account Permanently
</button>
          </div>
        )}

        {tab === 'favorites' && (
          <div className="space-y-3">
            {favorites.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <div className="text-5xl mb-4">⭐</div>
                <p>No favorites yet</p>
              </div>
            ) : favorites.map(fav => (
              <div key={fav.content_id} className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{fav.content?.type === 'exercise' ? '💪' : '🥗'}</span>
                  <div>
                    <div className="font-semibold">{fav.content?.title}</div>
                    <div className="text-gray-500 text-sm capitalize">{fav.content?.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a href={`/${fav.content?.type === 'exercise' ? 'exercises' : 'recipes'}/${fav.content_id}`} className="text-green-400 text-sm hover:underline">View</a>
                  <button onClick={() => removeFavorite(fav.content_id)} className="text-gray-600 hover:text-red-400 text-sm">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">Personal Info</h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-gray-400 text-sm">Display Name</label>
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 text-sm">Age</label>
                    <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 text-sm">Gender</label>
                    <div className="flex gap-2">
                      {['male', 'female'].map(g => (
                        <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))}
                          className={`flex-1 py-3 rounded-xl font-semibold capitalize text-sm transition-all ${form.gender === g ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400'}`}>{g}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 text-sm">Height (cm)</label>
                    <input type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 text-sm">Weight (kg)</label>
                    <input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-semibold">Activity Level</h2>
              {activityLevels.map(level => (
                <button key={level.id} onClick={() => setForm(f => ({ ...f, activity: level.id }))}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm ${form.activity === level.id ? 'bg-green-500 text-black font-semibold' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  {level.label}
                </button>
              ))}
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-semibold">Goal</h2>
              {goals.map(goal => (
                <button key={goal.id} onClick={() => setForm(f => ({ ...f, goal: goal.id }))}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm ${form.goal === goal.id ? 'bg-green-500 text-black font-semibold' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  {goal.label}
                </button>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold py-4 rounded-2xl transition-all">
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>
        )}

        {tab === 'data' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">📤 Export Data</h2>
              <p className="text-gray-400 text-sm">Download all your food logs, workouts, and weight history as a CSV file.</p>
              <button onClick={handleExport}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-xl transition-all">
                Download CSV Export
              </button>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">📥 Import Data</h2>
              <p className="text-gray-400 text-sm">Import data from a previously exported AuraHealth CSV file.</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={importing}
                className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-all">
                {importing ? 'Importing...' : 'Choose CSV File'}
              </button>
              {importMsg && <p className="text-green-400 text-sm">{importMsg}</p>}
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">💪 Add Custom Exercise</h2>
              <p className="text-gray-400 text-sm">Create your own exercise and it will appear in the library.</p>
              <div className="space-y-3">
                <input type="text" value={newExercise.title} onChange={e => setNewExercise(n => ({ ...n, title: e.target.value }))}
                  placeholder="Exercise name e.g. Cable Fly"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600" />
                <input type="text" value={newExercise.short_desc} onChange={e => setNewExercise(n => ({ ...n, short_desc: e.target.value }))}
                  placeholder="Short description"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600" />
                <input type="text" value={newExercise.muscles} onChange={e => setNewExercise(n => ({ ...n, muscles: e.target.value }))}
                  placeholder="Muscle groups e.g. chest, triceps"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600" />
                <input type="text" value={newExercise.equipment} onChange={e => setNewExercise(n => ({ ...n, equipment: e.target.value }))}
                  placeholder="Equipment e.g. Cable Machine"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600" />
                <div className="flex gap-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map(d => (
                    <button key={d} onClick={() => setNewExercise(n => ({ ...n, difficulty: d }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${newExercise.difficulty === d ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={saveCustomExercise} disabled={savingExercise || !newExercise.title.trim()}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold py-3 rounded-xl transition-all">
                {savingExercise ? 'Saving...' : exerciseSaved ? '✓ Exercise Added!' : 'Add Exercise'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}