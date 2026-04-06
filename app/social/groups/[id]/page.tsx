'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function GroupPage() {
  const [user, setUser] = useState<any>(null)
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchGroup()
      setLoading(false)
    }
    getData()
  }, [router])

  const fetchGroup = async () => {
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', params.id)
      .single()
    if (group) setGroup(group)

    const { data: members } = await supabase
      .from('group_members')
      .select('*, profile:user_id(*)')
      .eq('group_id', params.id)

    if (members) {
      const membersWithStats = await Promise.all(members.map(async (m: any) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { data: logs } = await supabase
          .from('logs_intake')
          .select('macros, created_at')
          .eq('user_id', m.user_id)
          .gte('created_at', today.toISOString())
        const todayCalories = logs?.reduce((a, l) => a + (l.macros?.calories || 0), 0) || 0
        const { data: workouts } = await supabase
          .from('workout_logs')
          .select('id')
          .eq('user_id', m.user_id)
          .gte('logged_at', today.toISOString())
        return {
          ...m,
          todayCalories,
          workoutsToday: workouts?.length || 0,
          dailyTarget: m.profile?.goals?.daily_calories || 2000,
        }
      }))
      setMembers(membersWithStats)
    }
  }

  const leaveGroup = async () => {
    if (!user) return
    await supabase.from('group_members').delete().eq('group_id', params.id).eq('user_id', user.id)
    router.push('/social')
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  if (!group) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-red-400">Group not found</div>
    </div>
  )

  const sortedMembers = [...members].sort((a, b) => b.todayCalories - a.todayCalories)

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm">
          ← Back
        </button>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">{group.name}</h1>
            <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400">
              {group.is_private ? '🔒 Private' : '🌍 Public'}
            </span>
          </div>
          {group.description && <p className="text-gray-400">{group.description}</p>}
          <div className="flex items-center gap-4 pt-2">
            <div className="bg-gray-800 rounded-xl px-4 py-2">
              <span className="text-gray-400 text-sm">Invite Code: </span>
              <span className="text-green-400 font-bold">{group.code}</span>
            </div>
            <span className="text-gray-500 text-sm">{members.length} members</span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">🏆 Today's Leaderboard</h2>
          <p className="text-gray-500 text-sm">Ranked by calories logged today</p>
          {sortedMembers.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No members yet</div>
          ) : (
            sortedMembers.map((member, i) => {
              const isMe = member.user_id === user?.id
              const progress = Math.min((member.todayCalories / member.dailyTarget) * 100, 100)
              const onTrack = member.todayCalories >= member.dailyTarget * 0.5
              return (
                <div key={member.id} className={`flex items-center gap-4 p-4 rounded-xl ${isMe ? 'bg-green-950 border border-green-800' : 'bg-gray-800'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-orange-600 text-black' : 'bg-gray-700 text-gray-400'}`}>
                    {i + 1}
                  </div>
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
                    {member.profile?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{member.profile?.username || 'User'}</span>
                      {isMe && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">You</span>}
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                      <div className="bg-green-400 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-green-400">{member.todayCalories} kcal</div>
                    <div className="text-gray-500 text-xs">{onTrack ? '✓ On track' : 'Behind'}</div>
                  </div>
                  {member.workoutsToday > 0 && (
                    <div className="text-xs bg-blue-900 text-blue-400 px-2 py-1 rounded-full flex-shrink-0">💪 Active</div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <button
          onClick={leaveGroup}
          className="w-full bg-gray-900 hover:bg-gray-800 text-red-400 font-semibold py-4 rounded-2xl transition-all border border-gray-800"
        >
          Leave Group
        </button>
      </div>
    </main>
  )
}