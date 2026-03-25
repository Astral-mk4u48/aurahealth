'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function History() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [weekStats, setWeekStats] = useState<any[]>([])
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

  const deleteLog = async (logId: string, dayDate: string) => {
    await supabase.from('logs_intake').delete().eq('id', logId)
    setWeekStats(prev => prev.map(day => {
      if (day.date !== dayDate) return day
      const updatedLogs = day.logs.filter((l: any) => l.id !== logId)
      const calories = updatedLogs.reduce((a: number, l: any) => a + (l.macros?.calories || 0), 0)
      const protein = updatedLogs.reduce((a: number, l: any) => a + (l.macros?.protein || 0), 0)
      const water_ml = updatedLogs.reduce((a: number, l: any) => a + (l.macros?.water_ml || 0), 0)
      return { ...day, logs: updatedLogs, calories, protein, water_ml }
    }))
  }

  const dailyCalories = profile?.goals?.daily_calories || 2000

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Log History</h1>
          <p className="text-gray-400 mt-1">Your last 30 days of tracking</p>
        </div>

        {weekStats.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-xl">No logs yet</p>
            <p className="text-sm mt-2">Start logging meals on the dashboard</p>
          </div>
        ) : (
          <div className="space-y-3">
            {weekStats.map((day) => (
              <div key={day.date} className="bg-gray-900 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setSelectedDay(selectedDay === day.date ? null : day.date)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-800 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <div className="font-semibold">{day.date}</div>
                      <div className="text-gray-400 text-sm">{day.logs.length} entries</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="text-green-400 font-bold">{day.calories} kcal</div>
                      <div className="text-gray-500">
                        {day.calories >= dailyCalories * 0.85 && day.calories <= dailyCalories * 1.15
                          ? '✓ On target'
                          : day.calories < dailyCalories * 0.85
                          ? '↓ Under'
                          : '↑ Over'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-400 font-bold">{day.protein}g</div>
                      <div className="text-gray-500">protein</div>
                    </div>
                    <div className="text-gray-400">{selectedDay === day.date ? '▲' : '▼'}</div>
                  </div>
                </button>

                {selectedDay === day.date && (
                  <div className="border-t border-gray-800 divide-y divide-gray-800">
                    {day.logs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <div className="font-semibold text-sm">{log.display_name}</div>
                          <div className="text-gray-500 text-xs capitalize">{log.entry_type}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-green-400 text-sm font-semibold">{log.macros?.calories} kcal</div>
                          <button
                            onClick={() => deleteLog(log.id, day.date)}
                            className="text-gray-600 hover:text-red-400 transition-all text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
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