'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const placeholders = [
  "I had 2 scrambled eggs and sourdough toast...",
  "Just finished a protein shake with banana...",
  "Ate a chicken rice bowl for lunch...",
  "Had a greek yogurt with berries...",
  "Drank 500ml of water...",
  "Just had a big mac and fries...",
  "Had oatmeal with honey for breakfast...",
]

function SkeletonBox({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded-2xl ${className}`} />
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [todayStats, setTodayStats] = useState({ calories: 0, protein: 0, water_ml: 0 })
  const [logs, setLogs] = useState<any[]>([])
  const [confirmation, setConfirmation] = useState<any>(null)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [fitData, setFitData] = useState<any>(null)
  const [fitConnected, setFitConnected] = useState(false)
  const router = useRouter()

  const hour = new Date().getHours()
  const isMorning = hour < 12
  const isEvening = hour >= 17

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(i => (i + 1) % placeholders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (!profile) { router.push('/onboarding'); return }
      setUser(user)
      setProfile(profile)
      if (profile?.google_fit_access_token) {
        fetchFitData(profile.google_fit_access_token)
      }
      await fetchTodayLogs(user.id)
      setLoading(false)
    }
    getUser()
  }, [router])

  const fetchFitData = async (accessToken: string) => {
    try {
      const res = await fetch('/api/google-fit/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      })
      const data = await res.json()
      setFitData(data)
      setFitConnected(true)
    } catch {
      console.log('Google Fit not connected')
    }
  }

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

  const logWater = async (ml: number) => {
    const waterLog = {
      id: Math.random().toString(),
      display_name: `Water ${ml}ml`,
      entry_type: 'water',
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: ml }
    }
    setLogs(prev => [waterLog, ...prev])
    setTodayStats(prev => ({ ...prev, water_ml: prev.water_ml + ml }))
    await supabase.from('logs_intake').insert({
      user_id: user.id,
      entry_type: 'water',
      display_name: `Water ${ml}ml`,
      amount: ml,
      unit: 'ml',
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: ml },
      is_ai_generated: false,
    })
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
    const newLog = {
      id: Math.random().toString(),
      display_name: confirmation.name,
      entry_type: confirmation.water_ml > 0 ? 'water' : 'food',
      macros: {
        calories: confirmation.calories,
        protein: confirmation.protein,
        carbs: confirmation.carbs,
        fat: confirmation.fat,
        water_ml: confirmation.water_ml,
      }
    }
    setLogs(prev => [newLog, ...prev])
    setTodayStats(prev => ({
      calories: prev.calories + confirmation.calories,
      protein: prev.protein + confirmation.protein,
      water_ml: prev.water_ml + confirmation.water_ml,
    }))
    setConfirmation(null)
    setMessage('')
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
  }

  const dailyCalories = profile?.goals?.daily_calories || 2000
  const proteinTarget = profile?.goals?.protein_target || 150
  const waterTarget = profile?.goals?.water_target_ml || 2500

  const getGreeting = () => {
    const name = user?.user_metadata?.full_name?.split(' ')[0] || profile?.username
    if (isMorning) return `Good morning, ${name} ☀️`
    if (isEvening) return `Good evening, ${name} 🌙`
    return `Welcome back, ${name} 👋`
  }

  const getAICoachMessage = () => {
    const name = user?.user_metadata?.full_name?.split(' ')[0] || profile?.username
    const remaining = dailyCalories - todayStats.calories
    if (todayStats.calories === 0 && isMorning) return `Good morning ${name}! Start your day strong — log your breakfast and I will track your progress. 💪`
    if (todayStats.calories === 0 && isEvening) return `Hey ${name}, you have not logged anything today. It is not too late — log your meals and get back on track!`
    if (todayStats.calories === 0) return `Hey ${name}! Start logging your meals and I will give you personalized insights.`
    if (remaining > 0) return `You have ${remaining} kcal remaining today. You have hit ${todayStats.protein}g protein so far — keep it up! 💪`
    return `You have hit your calorie goal for today! Great discipline ${name}. Focus on hitting your ${proteinTarget}g protein target. 🎯`
  }

  if (loading) return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <SkeletonBox className="h-16 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonBox className="h-36" />
          <SkeletonBox className="h-36" />
          <SkeletonBox className="h-36" />
        </div>
        <SkeletonBox className="h-24" />
        <SkeletonBox className="h-32" />
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
              AuraHealth
            </h1>
            <p className="text-gray-400 mt-1">{getGreeting()}</p>
          </div>
        </div>

        {isEvening && todayStats.calories > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700">
            <p className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-3">Evening Summary</p>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-green-400 font-bold text-lg">{todayStats.calories}</div>
                <div className="text-gray-500">calories eaten</div>
              </div>
              <div>
                <div className="text-blue-400 font-bold text-lg">{todayStats.protein}g</div>
                <div className="text-gray-500">protein</div>
              </div>
              <div>
                <div className="text-green-400 font-bold text-lg">{Math.max(0, dailyCalories - todayStats.calories)}</div>
                <div className="text-gray-500">kcal remaining</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-2">
            <div className="text-4xl font-bold text-green-400">{todayStats.calories}</div>
            <div className="text-gray-400">/ {dailyCalories} kcal</div>
            <div className="text-white font-semibold">Calories</div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-green-400 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min((todayStats.calories / dailyCalories) * 100, 100)}%` }}></div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-2">
            <div className="text-4xl font-bold text-blue-400">{todayStats.protein}g</div>
            <div className="text-gray-400">/ {proteinTarget}g protein</div>
            <div className="text-white font-semibold">Protein</div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-blue-400 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min((todayStats.protein / proteinTarget) * 100, 100)}%` }}></div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-2">
            <div className="text-4xl font-bold text-cyan-400">{todayStats.water_ml}ml</div>
            <div className="text-gray-400">/ {waterTarget}ml water</div>
            <div className="text-white font-semibold">Water</div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-cyan-400 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min((todayStats.water_ml / waterTarget) * 100, 100)}%` }}></div>
            </div>
          </div>
        </div>

        {fitConnected && fitData ? (
          <div className="bg-gray-900 rounded-2xl p-6 border border-blue-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⌚</span>
                <span className="text-blue-400 font-semibold">Google Fit Today</span>
              </div>
              <span className="text-xs text-gray-500">Live from your watch</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{fitData.steps.toLocaleString()}</div>
                <div className="text-gray-400 text-xs">steps</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-orange-400">{fitData.calories}</div>
                <div className="text-gray-400 text-xs">kcal burned</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{fitData.heartRate || '-'}</div>
                <div className="text-gray-400 text-xs">bpm peak</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{fitData.distance}</div>
                <div className="text-gray-400 text-xs">km</div>
              </div>
            </div>
          </div>
        ) : (
  <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <span className="text-2xl">⌚</span>
      <div>
        <div className="font-semibold">Connect Google Fit</div>
        <div className="text-gray-400 text-sm">Sync your Pixel Watch data automatically</div>
      </div>
    </div>
    <button
      onClick={() => window.location.href = '/api/google-fit/connect'}
      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
    >
      Connect
    </button>
  </div>
)}

        <div className="bg-gray-900 rounded-2xl p-6 border border-green-900">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-semibold text-sm">AI Coach</span>
          </div>
          <p className="text-gray-300">{getAICoachMessage()}</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">
            {isMorning ? '🌅 Log your breakfast' : isEvening ? '🌙 Log your dinner' : '☀️ Quick Log'}
          </h2>
          <div className="flex gap-2 flex-wrap">
            {[250, 500, 750, 1000].map(ml => (
              <button
                key={ml}
                onClick={() => logWater(ml)}
                className="bg-cyan-900 hover:bg-cyan-800 text-cyan-400 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
              >
                💧 {ml}ml
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLog()}
              placeholder={placeholders[placeholderIndex]}
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600 transition-all"
            />
            <button
              onClick={handleLog}
              disabled={aiLoading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
            >
              {aiLoading ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin block"></span>
              ) : 'Log'}
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
                  <div className="text-gray-400 text-sm capitalize">{log.entry_type}</div>
                </div>
                <div className="text-green-400 font-bold">
                  {log.entry_type === 'water' ? `${log.macros?.water_ml}ml` : `${log.macros?.calories} kcal`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
