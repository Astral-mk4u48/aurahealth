'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Progress() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [tab, setTab] = useState<'overview' | 'food' | 'water' | 'weight'>('overview')
  const [logs, setLogs] = useState<any[]>([])
  const [weightLogs, setWeightLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStats, setWeekStats] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile) { router.push('/onboarding'); return }
      setUser(user)
      setProfile(profile)
      await Promise.all([fetchLogs(user.id), fetchWeightLogs(user.id)])
      setLoading(false)
    }
    getData()
  }, [router])

  const fetchLogs = async (userId: string) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data } = await supabase
      .from('logs_intake')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
    if (data) {
      setLogs(data)
      const days: any = {}
      data.forEach((log: any) => {
        const date = new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        if (!days[date]) days[date] = { date, calories: 0, protein: 0, water_ml: 0, logs: [] }
        days[date].calories += log.macros?.calories || 0
        days[date].protein += log.macros?.protein || 0
        days[date].water_ml += log.macros?.water_ml || 0
        days[date].logs.push(log)
      })
      setWeekStats(Object.values(days))
    }
  }

  const fetchWeightLogs = async (userId: string) => {
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true })
    if (data) setWeightLogs(data)
  }

  const deleteLog = async (logId: string) => {
    await supabase.from('logs_intake').delete().eq('id', logId)
    setLogs(prev => prev.filter(l => l.id !== logId))
    setWeekStats(prev => prev.map(day => ({
      ...day,
      logs: day.logs.filter((l: any) => l.id !== logId),
      calories: day.logs.filter((l: any) => l.id !== logId).reduce((a: number, l: any) => a + (l.macros?.calories || 0), 0),
      protein: day.logs.filter((l: any) => l.id !== logId).reduce((a: number, l: any) => a + (l.macros?.protein || 0), 0),
      water_ml: day.logs.filter((l: any) => l.id !== logId).reduce((a: number, l: any) => a + (l.macros?.water_ml || 0), 0),
    })))
  }

  const dailyCalories = profile?.goals?.daily_calories || 2000
  const foodLogs = logs.filter(l => l.entry_type === 'food')
  const waterLogs = logs.filter(l => l.entry_type === 'water')
  const totalWater = waterLogs.reduce((a, l) => a + (l.macros?.water_ml || 0), 0)
  const avgCalories = weekStats.length > 0 ? Math.round(weekStats.reduce((a, d) => a + d.calories, 0) / weekStats.length) : 0

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Progress</h1>
          <p className="text-gray-400 mt-1">Your health data in one place</p>
        </div>

        <div className="flex bg-gray-900 rounded-xl p-1 w-fit gap-1">
          {(['overview', 'food', 'water', 'weight'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}
            >
              {t === 'overview' ? '📊 Overview' : t === 'food' ? '🍽 Food' : t === 'water' ? '💧 Water' : '⚖️ Weight'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-green-400">{avgCalories}</div>
                <div className="text-gray-400 text-sm">avg kcal/day</div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-cyan-400">{Math.round(totalWater / 1000)}L</div>
                <div className="text-gray-400 text-sm">total water (30d)</div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 text-center">
                <div className="text-3xl font-bold text-purple-400">{weekStats.length}</div>
                <div className="text-gray-400 text-sm">days logged</div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-semibold">Recent Days</h2>
              {weekStats.slice(0, 7).map((day, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="w-28 text-gray-400 text-sm">{day.date.split(',')[0]}</div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${day.calories > dailyCalories * 1.15 ? 'bg-red-500' : day.calories >= dailyCalories * 0.85 ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${Math.min((day.calories / dailyCalories) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-white font-semibold">{day.calories}</span>
                    <span className="text-gray-500"> kcal</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'food' && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Food Logs (30 days)</h2>
            {weekStats.map((day) => (
              <div key={day.date} className="bg-gray-900 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <span className="font-semibold">{day.date}</span>
                  <span className="text-green-400 font-bold">{day.calories} kcal</span>
                </div>
                {day.logs.filter((l: any) => l.entry_type === 'food').map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{log.display_name}</div>
                      <div className="text-gray-500 text-xs">{log.macros?.protein}g protein · {log.macros?.carbs}g carbs · {log.macros?.fat}g fat</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 text-sm font-semibold">{log.macros?.calories} kcal</span>
                      <button onClick={() => deleteLog(log.id)} className="text-gray-600 hover:text-red-400 text-xs transition-all">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'water' && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl p-5 text-center">
              <div className="text-4xl font-bold text-cyan-400">{Math.round(totalWater / 1000 * 10) / 10}L</div>
              <div className="text-gray-400">total water logged in 30 days</div>
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Water Logs</h2>
              {waterLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
                  <div>
                    <div className="font-medium text-sm">{log.display_name}</div>
                    <div className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-400 font-bold">{log.macros?.water_ml}ml</span>
                    <button onClick={() => deleteLog(log.id)} className="text-gray-600 hover:text-red-400 text-xs transition-all">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'weight' && (
          <div className="space-y-4">
            {weightLogs.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{weightLogs[weightLogs.length - 1].weight}kg</div>
                  <div className="text-gray-400 text-sm">current</div>
                </div>
                <div className="bg-gray-900 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{weightLogs[0].weight}kg</div>
                  <div className="text-gray-400 text-sm">starting</div>
                </div>
                <div className="bg-gray-900 rounded-2xl p-4 text-center">
                  <div className={`text-2xl font-bold ${weightLogs[weightLogs.length - 1].weight - weightLogs[0].weight < 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(weightLogs[weightLogs.length - 1].weight - weightLogs[0].weight) > 0 ? '+' : ''}
                    {(weightLogs[weightLogs.length - 1].weight - weightLogs[0].weight).toFixed(1)}kg
                  </div>
                  <div className="text-gray-400 text-sm">change</div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Weight History</h2>
              {weightLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p>No weight logs yet.</p>
                  <a href="/weight" className="text-green-400 text-sm mt-2 block">Log your weight →</a>
                </div>
              ) : (
                [...weightLogs].reverse().map(log => (
                  <div key={log.id} className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
                    <div>
                      <div className="font-semibold">{log.weight}kg</div>
                      <div className="text-gray-400 text-sm">{new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{log.note && ` · ${log.note}`}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}