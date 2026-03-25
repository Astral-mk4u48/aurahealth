'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function WeightTracker() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (!profile) { router.push('/onboarding'); return }
      setUser(user)
      setProfile(profile)
      await fetchLogs(user.id)
      setLoading(false)
    }
    getData()
  }, [router])

  const fetchLogs = async (userId: string) => {
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true })
    if (data) setLogs(data)
  }

  const logWeight = async () => {
    if (!weight || !user) return
    setSaving(true)
    await supabase.from('weight_logs').insert({
      user_id: user.id,
      weight: parseFloat(weight),
      note: note.trim() || null,
    })
    setWeight('')
    setNote('')
    await fetchLogs(user.id)
    setSaving(false)
  }

  const deleteLog = async (id: string) => {
    await supabase.from('weight_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  const startWeight = logs[0]?.weight
  const currentWeight = logs[logs.length - 1]?.weight
  const change = startWeight && currentWeight ? (currentWeight - startWeight).toFixed(1) : null
  const minWeight = logs.length > 0 ? Math.min(...logs.map(l => l.weight)) : 0
  const maxWeight = logs.length > 0 ? Math.max(...logs.map(l => l.weight)) : 0
  const range = maxWeight - minWeight || 1

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Weight Tracker</h1>
          <p className="text-gray-400 mt-1">Track your progress over time</p>
        </div>

        {logs.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400">{currentWeight}kg</div>
              <div className="text-gray-400 text-sm">current weight</div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">{startWeight}kg</div>
              <div className="text-gray-400 text-sm">starting weight</div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-4 text-center">
              <div className={`text-3xl font-bold ${parseFloat(change || '0') < 0 ? 'text-green-400' : parseFloat(change || '0') > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {change ? `${parseFloat(change) > 0 ? '+' : ''}${change}kg` : '-'}
              </div>
              <div className="text-gray-400 text-sm">total change</div>
            </div>
          </div>
        )}

        {logs.length > 1 && (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Progress Chart</h2>
            <div className="flex items-end gap-1 h-32">
              {logs.map((log, i) => {
                const height = Math.max(((log.weight - minWeight) / range) * 80 + 20, 8)
                return (
                  <div key={log.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-green-500 rounded-t-sm transition-all"
                      style={{ height: `${height}px` }}
                    />
                    <div className="absolute bottom-full mb-1 bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {log.weight}kg
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{new Date(logs[0].logged_at).toLocaleDateString()}</span>
              <span>{new Date(logs[logs.length - 1].logged_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Log Today's Weight</h2>
          <div className="flex gap-3">
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="Weight in kg"
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
            />
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
            />
            <button
              onClick={logWeight}
              disabled={saving || !weight}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-semibold px-6 py-3 rounded-xl transition-all"
            >
              {saving ? '...' : 'Log'}
            </button>
          </div>
        </div>

        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-3">
            <h2 className="text-xl font-semibold">History</h2>
            {[...logs].reverse().map((log) => (
              <div key={log.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                <div>
                  <div className="font-semibold">{log.weight}kg</div>
                  <div className="text-gray-400 text-sm">
                    {new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {log.note && ` · ${log.note}`}
                  </div>
                </div>
                <button
                  onClick={() => deleteLog(log.id)}
                  className="text-gray-600 hover:text-red-400 transition-all text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}