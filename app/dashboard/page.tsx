'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [todayStats, setTodayStats] = useState({ calories: 0, protein: 0, water_ml: 0 })
  const [logs, setLogs] = useState<any[]>([])
  const [confirmation, setConfirmation] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/')
        } else {
            const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single()
            if (!profile) {
                router.push('/onboarding')
                return
            }
            setUser(user)
            await fetchTodayLogs(user.id)
            setLoading(false)
        }
    }

    getUser()
  }, [router])

  const fetchTodayLogs = async (userId: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('logs_intake')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (data) {
      setLogs(data)
      const stats = data.reduce((acc: any, log: any) => ({
        calories: acc.calories + (log.macros?.calories || 0),
        protein: acc.protein + (log.macros?.protein || 0),
        water_ml: acc.water_ml + (log.macros?.water_ml || 0),
      }), { calories: 0, protein: 0, water_ml: 0 })
      setTodayStats(stats)
    }
  }

  const handleLog = async () => {
    if (!message.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/log-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      const nutrition = await res.json()
      setConfirmation({ ...nutrition, originalMessage: message })
    } catch {
      alert('AI could not process that. Try again!')
    }
    setAiLoading(false)
  }

  const confirmLog = async () => {
    if (!confirmation || !user) return
    await supabase.from('logs_intake').insert({
      user_id: user.id,
      entry_type: confirmation.water_ml > 0 ? 'water' : 'food',
      display_name: confirmation.name,
      amount: 1,
      unit: 'serving',
      macros: {
        calories: confirmation.calories,
        protein: confirmation.protein,
        carbs: confirmation.carbs,
        fat: confirmation.fat,
        water_ml: confirmation.water_ml,
      },
      is_ai_generated: true,
    })
    setConfirmation(null)
    setMessage('')
    await fetchTodayLogs(user.id)
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
              AuraHealth
            </h1>
            <p className="text-gray-400 mt-1">Welcome back, {user?.user_metadata?.full_name?.split(' ')[0]}</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
            className="text-gray-400 hover:text-white text-sm border border-gray-700 px-4 py-2 rounded-lg"
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-2">
            <div className="text-4xl font-bold text-green-400">{todayStats.calories}</div>
            <div className="text-gray-400">/ 2000 kcal</div>
            <div className="text-white font-semibold">Calories</div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-green-400 h-2 rounded-full transition-all" style={{ width: `${Math.min((todayStats.calories / 2000) * 100, 100)}%` }}></div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-2">
            <div className="text-4xl font-bold text-blue-400">{todayStats.protein}g</div>
            <div className="text-gray-400">/ 150g protein</div>
            <div className="text-white font-semibold">Protein</div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: `${Math.min((todayStats.protein / 150) * 100, 100)}%` }}></div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-2">
            <div className="text-4xl font-bold text-cyan-400">{todayStats.water_ml}ml</div>
            <div className="text-gray-400">/ 2500ml water</div>
            <div className="text-white font-semibold">Water</div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-cyan-400 h-2 rounded-full transition-all" style={{ width: `${Math.min((todayStats.water_ml / 2500) * 100, 100)}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-green-900">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-semibold text-sm">AI Coach</span>
          </div>
          <p className="text-gray-300">
            {todayStats.calories === 0
              ? `Hey ${user?.user_metadata?.full_name?.split(' ')[0]}! Start logging your meals and I will give you personalized insights.`
              : `Great work! You have hit ${todayStats.calories} calories and ${todayStats.protein}g protein today. Keep it up!`
            }
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Quick Log</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLog()}
              placeholder="I had 2 eggs and toast for breakfast..."
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
            />
            <button
              onClick={handleLog}
              disabled={aiLoading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
            >
              {aiLoading ? '...' : 'Log'}
            </button>
          </div>

          {confirmation && (
            <div className="bg-gray-800 rounded-xl p-4 space-y-3 border border-green-800">
              <p className="text-green-400 font-semibold">AI detected: {confirmation.name}</p>
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div className="bg-gray-700 rounded-lg p-2">
                  <div className="text-green-400 font-bold">{confirmation.calories}</div>
                  <div className="text-gray-400">kcal</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-2">
                  <div className="text-blue-400 font-bold">{confirmation.protein}g</div>
                  <div className="text-gray-400">protein</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-2">
                  <div className="text-yellow-400 font-bold">{confirmation.carbs}g</div>
                  <div className="text-gray-400">carbs</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-2">
                  <div className="text-red-400 font-bold">{confirmation.fat}g</div>
                  <div className="text-gray-400">fat</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={confirmLog} className="flex-1 bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg">
                  Confirm and Log
                </button>
                <button onClick={() => setConfirmation(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-3">
            <h2 className="text-xl font-semibold">Todays Log</h2>
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                <div>
                  <div className="font-semibold">{log.display_name}</div>
                  <div className="text-gray-400 text-sm">{log.entry_type}</div>
                </div>
                <div className="text-green-400 font-bold">{log.macros?.calories} kcal</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}