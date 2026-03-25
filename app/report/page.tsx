'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function WeeklyReport() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
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
      await fetchWeekLogs(user.id, profile)
      setLoading(false)
    }
    getData()
  }, [router])

  const fetchWeekLogs = async (userId: string, profile: any) => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { data } = await supabase
      .from('logs_intake')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (data) {
      const dailyCalories = profile?.goals?.daily_calories || 2000
      const days: any = {}
      data.forEach((log: any) => {
        const date = new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        if (!days[date]) days[date] = { date, calories: 0, protein: 0, water_ml: 0, logs: 0 }
        days[date].calories += log.macros?.calories || 0
        days[date].protein += log.macros?.protein || 0
        days[date].water_ml += log.macros?.water_ml || 0
        days[date].logs += 1
      })
      const last7 = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        last7.push(days[key] || { date: key, calories: 0, protein: 0, water_ml: 0, logs: 0 })
      }
      setWeekStats(last7)
    }
  }

  const generateReport = async () => {
    setGenerating(true)
    const name = user?.user_metadata?.full_name?.split(' ')[0]
    const dailyCalories = profile?.goals?.daily_calories || 2000
    const proteinTarget = profile?.goals?.protein_target || 150
    const goalType = profile?.goals?.goal_type || 'maintain'
    const summary = weekStats.map(d =>
      `${d.date}: ${d.calories} kcal, ${d.protein}g protein, ${d.water_ml}ml water`
    ).join('\n')
    const res = await fetch('/api/weekly-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, summary, dailyCalories, proteinTarget, goalType })
    })
    const data = await res.json()
    setReport(data.report)
    setGenerating(false)
  }

  const dailyCalories = profile?.goals?.daily_calories || 2000
  const maxCalories = Math.max(...weekStats.map(d => d.calories), 1)
  const avgCalories = weekStats.length > 0 ? Math.round(weekStats.reduce((a, d) => a + d.calories, 0) / 7) : 0
  const avgProtein = weekStats.length > 0 ? Math.round(weekStats.reduce((a, d) => a + d.protein, 0) / 7) : 0
  const daysLogged = weekStats.filter(d => d.logs > 0).length
  const bestDay = weekStats.length > 0 ? weekStats.reduce((best, d) => d.calories > best.calories ? d : best, weekStats[0]) : null

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Weekly Report</h1>
          <p className="text-gray-400 mt-1">Your last 7 days at a glance</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{daysLogged}</div>
            <div className="text-gray-400 text-sm">days logged</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{avgCalories}</div>
            <div className="text-gray-400 text-sm">avg calories</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{avgProtein}g</div>
            <div className="text-gray-400 text-sm">avg protein</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{bestDay ? bestDay.date.split(',')[0] : '-'}</div>
            <div className="text-gray-400 text-sm">best day</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Calorie Heat Map</h2>
          <div className="flex items-end gap-2 h-32">
            {weekStats.map((day, i) => {
              const height = day.calories > 0 ? Math.max((day.calories / maxCalories) * 100, 8) : 4
              const isOnTarget = day.calories >= dailyCalories * 0.85 && day.calories <= dailyCalories * 1.15
              const isOver = day.calories > dailyCalories * 1.15
              const isEmpty = day.calories === 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative group">
                    <div
                      className={`w-full rounded-t-lg transition-all ${isEmpty ? 'bg-gray-800' : isOver ? 'bg-red-500' : isOnTarget ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ height: `${height}px` }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {day.calories} kcal
                    </div>
                  </div>
                  <div className="text-gray-500 text-xs">{day.date.split(',')[0]}</div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> On target</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded"></span> Under target</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded"></span> Over target</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-800 rounded"></span> No data</span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-semibold">Daily Breakdown</h2>
          {weekStats.map((day, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div className="w-24 text-gray-400 text-sm">{day.date.split(',')[0]}</div>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${day.calories > dailyCalories * 1.15 ? 'bg-red-500' : day.calories >= dailyCalories * 0.85 ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min((day.calories / dailyCalories) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <span className="text-white font-semibold">{day.calories}</span>
                <span className="text-gray-500 text-sm"> kcal</span>
              </div>
            </div>
          ))}
        </div>

        {report && (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-3 border border-green-900">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h2 className="text-xl font-semibold text-green-400">AI Weekly Analysis</h2>
            </div>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">{report}</p>
          </div>
        )}

        <button
          onClick={generateReport}
          disabled={generating}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold py-4 rounded-2xl transition-all text-lg"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              Generating your report...
            </span>
          ) : '✨ Generate AI Weekly Report'}
        </button>
      </div>
    </main>
  )
}