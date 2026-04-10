'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function GroupPage() {
  const [user, setUser] = useState<any>(null)
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [bans, setBans] = useState<any[]>([])
  const [mutes, setMutes] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'leaderboard' | 'chat' | 'members'>('leaderboard')
  const [showSettings, setShowSettings] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [banModal, setBanModal] = useState<any>(null)
  const [muteModal, setMuteModal] = useState<any>(null)
  const [banDuration, setBanDuration] = useState('1day')
  const [muteDuration, setMuteDuration] = useState('1hour')
  const [banReason, setBanReason] = useState('')
  const [muteReason, setMuteReason] = useState('')
  const [transferModal, setTransferModal] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchGroup(user.id)
      await fetchMessages()
      setLoading(false)
    }
    getData()

    const channel = supabase
      .channel(`group-${params.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${params.id}`
      }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles').select('username').eq('id', payload.new.user_id).single()
        setMessages(prev => [...prev, { ...payload.new, profile }])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchGroup = async (userId: string) => {
    const { data: group } = await supabase
      .from('groups').select('*').eq('id', params.id).single()
    if (group) { setGroup(group); setIsAdmin(group.creator_id === userId) }

    const { data: memberRows } = await supabase
      .from('group_members').select('*').eq('group_id', params.id)
    if (!memberRows || memberRows.length === 0) { setMembers([]); return }

    const { data: banData } = await supabase
      .from('group_bans').select('*').eq('group_id', params.id)
    if (banData) setBans(banData)

    const { data: muteData } = await supabase
      .from('group_mutes').select('*').eq('group_id', params.id)
    if (muteData) setMutes(muteData)

    const userIds = memberRows.map((m: any) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles').select('id, username, goals').in('id', userIds)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const membersWithStats = await Promise.all(memberRows.map(async (m: any) => {
      const profile = profiles?.find(p => p.id === m.user_id)
      const { data: logs } = await supabase
        .from('logs_intake').select('macros').eq('user_id', m.user_id).gte('created_at', today.toISOString())
      const todayCalories = logs?.reduce((a: number, l: any) => a + (l.macros?.calories || 0), 0) || 0
      const { data: workouts } = await supabase
        .from('workout_logs').select('id').eq('user_id', m.user_id).gte('logged_at', today.toISOString())
      return {
        ...m,
        username: profile?.username || 'User',
        dailyTarget: profile?.goals?.daily_calories || 2000,
        todayCalories,
        workoutsToday: workouts?.length || 0,
      }
    }))
    setMembers(membersWithStats)
  }

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('group_messages')
      .select('*, profile:user_id(username)')
      .eq('group_id', params.id)
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || !user || sending) return
    setSending(true)

    const activeBan = bans.find(b => b.user_id === user.id && new Date(b.banned_until) > new Date())
    if (activeBan) {
      alert(`You are banned until ${new Date(activeBan.banned_until).toLocaleDateString()}. Reason: ${activeBan.reason}`)
      setSending(false)
      return
    }

    const activeMute = mutes.find(m => m.user_id === user.id && new Date(m.muted_until) > new Date())
    if (activeMute) {
      alert(`You are muted until ${new Date(activeMute.muted_until).toLocaleTimeString()}. Reason: ${activeMute.reason}`)
      setSending(false)
      return
    }

    const modRes = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: messageInput.trim() })
    })
    const modData = await modRes.json()

    if (modData.isProfanity) {
      alert('Your message was blocked — it contains inappropriate content.')
      setSending(false)
      return
    }

    await supabase.from('group_messages').insert({
      group_id: params.id,
      user_id: user.id,
      content: messageInput.trim(),
    })
    setMessageInput('')
    setSending(false)
  }

  const deleteMessage = async (messageId: string) => {
    await supabase.from('group_messages').update({ is_deleted: true }).eq('id', messageId)
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }

  const pinMessage = async (messageId: string, currentPin: boolean) => {
    await supabase.from('group_messages').update({ is_pinned: !currentPin }).eq('id', messageId)
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: !currentPin } : m))
  }

  const kickMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Kick ${memberName}? They can rejoin anytime.`)) return
    await supabase.from('group_members').delete().eq('group_id', params.id).eq('user_id', memberId)
    setMembers(prev => prev.filter(m => m.user_id !== memberId))
  }

  const banMember = async () => {
    if (!banModal) return
    const durations: any = { '1hour': 1/24, '1day': 1, '3days': 3, '1week': 7, '1month': 30, 'permanent': 36500 }
    const bannedUntil = new Date()
    bannedUntil.setDate(bannedUntil.getDate() + (durations[banDuration] || 1))
    await supabase.from('group_bans').upsert({
      group_id: params.id, user_id: banModal.user_id,
      banned_by: user.id, reason: banReason || 'No reason given',
      banned_until: bannedUntil.toISOString(),
    })
    await supabase.from('group_members').delete().eq('group_id', params.id).eq('user_id', banModal.user_id)
    setMembers(prev => prev.filter(m => m.user_id !== banModal.user_id))
    setBans(prev => [...prev, { user_id: banModal.user_id, banned_until: bannedUntil.toISOString(), reason: banReason }])
    setBanModal(null)
    setBanReason('')
  }

  const muteMember = async () => {
    if (!muteModal) return
    const durations: any = { '15mins': 15/1440, '1hour': 1/24, '6hours': 6/24, '1day': 1, '1week': 7 }
    const mutedUntil = new Date()
    mutedUntil.setDate(mutedUntil.getDate() + (durations[muteDuration] || 1/24))
    await supabase.from('group_mutes').upsert({
      group_id: params.id, user_id: muteModal.user_id,
      muted_until: mutedUntil.toISOString(), reason: muteReason || 'No reason given',
    })
    setMutes(prev => [...prev, { user_id: muteModal.user_id, muted_until: mutedUntil.toISOString(), reason: muteReason }])
    setMuteModal(null)
    setMuteReason('')
  }

  const unbanMember = async (userId: string) => {
    await supabase.from('group_bans').delete().eq('group_id', params.id).eq('user_id', userId)
    setBans(prev => prev.filter(b => b.user_id !== userId))
  }

  const unmuteMember = async (userId: string) => {
    await supabase.from('group_mutes').delete().eq('group_id', params.id).eq('user_id', userId)
    setMutes(prev => prev.filter(m => m.user_id !== userId))
  }

  const transferOwnership = async (newOwnerId: string, newOwnerName: string) => {
    if (!confirm(`Transfer admin to ${newOwnerName}? You will lose admin access.`)) return
    await supabase.from('groups').update({ creator_id: newOwnerId }).eq('id', params.id)
    setGroup((g: any) => ({ ...g, creator_id: newOwnerId }))
    setIsAdmin(false)
    setTransferModal(false)
  }

  const leaveGroup = async () => {
    if (isAdmin) { alert('Transfer ownership first before leaving.'); return }
    if (!confirm('Leave this group?')) return
    await supabase.from('group_members').delete().eq('group_id', params.id).eq('user_id', user.id)
    router.push('/social')
  }

  const deleteGroup = async () => {
    if (!confirm('Permanently delete this group and ALL data? This cannot be undone.')) return
    await supabase.from('group_messages').delete().eq('group_id', params.id)
    await supabase.from('group_bans').delete().eq('group_id', params.id)
    await supabase.from('group_mutes').delete().eq('group_id', params.id)
    await supabase.from('group_members').delete().eq('group_id', params.id)
    await supabase.from('groups').delete().eq('id', params.id)
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
  const activeBans = bans.filter(b => new Date(b.banned_until) > new Date())
  const activeMutes = mutes.filter(m => new Date(m.muted_until) > new Date())
  const pinnedMessages = messages.filter(m => m.is_pinned)

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {banModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="font-bold text-lg text-red-400">Ban {banModal.username}</h3>
              <div className="space-y-1">
                <label className="text-gray-400 text-sm">Duration</label>
                <select value={banDuration} onChange={e => setBanDuration(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none">
                  <option value="1hour">1 Hour</option>
                  <option value="1day">1 Day</option>
                  <option value="3days">3 Days</option>
                  <option value="1week">1 Week</option>
                  <option value="1month">1 Month</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 text-sm">Reason</label>
                <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. Spamming" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setBanModal(null)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl">Cancel</button>
                <button onClick={banMember} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl">Ban</button>
              </div>
            </div>
          </div>
        )}

        {muteModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="font-bold text-lg text-yellow-400">Mute {muteModal.username}</h3>
              <div className="space-y-1">
                <label className="text-gray-400 text-sm">Duration</label>
                <select value={muteDuration} onChange={e => setMuteDuration(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none">
                  <option value="15mins">15 Minutes</option>
                  <option value="1hour">1 Hour</option>
                  <option value="6hours">6 Hours</option>
                  <option value="1day">1 Day</option>
                  <option value="1week">1 Week</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 text-sm">Reason</label>
                <input type="text" value={muteReason} onChange={e => setMuteReason(e.target.value)} placeholder="e.g. Spamming" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setMuteModal(null)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl">Cancel</button>
                <button onClick={muteMember} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl">Mute</button>
              </div>
            </div>
          </div>
        )}

        {transferModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="font-bold text-lg">Transfer Ownership</h3>
              <p className="text-gray-400 text-sm">Select a member to become the new admin. You will lose admin access.</p>
              <div className="space-y-2">
                {members.filter(m => m.user_id !== user?.id).map(m => (
                  <button
                    key={m.user_id}
                    onClick={() => transferOwnership(m.user_id, m.username)}
                    className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-3 text-left transition-all"
                  >
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                      {m.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium">{m.username}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setTransferModal(false)} className="w-full bg-gray-800 text-white py-3 rounded-xl">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Back</button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`text-sm px-3 py-2 rounded-lg transition-all ${showSettings ? 'bg-green-500 text-black font-semibold' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            ⚙️ Settings
          </button>
        </div>

        {showSettings && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-5">
            <h3 className="font-bold text-lg">Group Settings</h3>
            <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs">Invite Code</div>
                <div className="text-green-400 font-bold tracking-widest text-lg">{group.code}</div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(group.code); alert('Copied!') }} className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg">Copy</button>
            </div>

            {isAdmin && (
              <>
                {activeBans.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-red-400 text-sm font-semibold">Banned ({activeBans.length})</div>
                    {activeBans.map(ban => (
                      <div key={ban.user_id} className="flex items-center justify-between bg-red-950 rounded-xl px-4 py-3 border border-red-900">
                        <div>
                          <div className="text-xs text-red-300">{ban.reason}</div>
                          <div className="text-xs text-red-500">Until: {new Date(ban.banned_until).toLocaleDateString()}</div>
                        </div>
                        <button onClick={() => unbanMember(ban.user_id)} className="text-green-400 text-xs hover:text-green-300">Unban</button>
                      </div>
                    ))}
                  </div>
                )}

                {activeMutes.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-yellow-400 text-sm font-semibold">Muted ({activeMutes.length})</div>
                    {activeMutes.map(mute => (
                      <div key={mute.user_id} className="flex items-center justify-between bg-yellow-950 rounded-xl px-4 py-3 border border-yellow-900">
                        <div>
                          <div className="text-xs text-yellow-300">{mute.reason}</div>
                          <div className="text-xs text-yellow-500">Until: {new Date(mute.muted_until).toLocaleTimeString()}</div>
                        </div>
                        <button onClick={() => unmuteMember(mute.user_id)} className="text-green-400 text-xs hover:text-green-300">Unmute</button>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setTransferModal(true)} className="w-full bg-gray-800 hover:bg-gray-700 text-yellow-400 font-semibold py-3 rounded-xl transition-all">
                  👑 Transfer Ownership
                </button>
                <button onClick={deleteGroup} className="w-full bg-red-950 hover:bg-red-900 text-red-400 font-semibold py-3 rounded-xl border border-red-900">
                  🗑️ Delete Group
                </button>
              </>
            )}

            {!isAdmin && (
              <button onClick={leaveGroup} className="w-full bg-gray-800 hover:bg-gray-700 text-red-400 font-semibold py-3 rounded-xl">
                Leave Group
              </button>
            )}
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            {group.description && <p className="text-gray-400 text-sm">{group.description}</p>}
            <p className="text-gray-500 text-xs mt-1">{members.length} members</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-1 rounded-full">👑 Admin</span>}
            <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400">{group.is_private ? '🔒' : '🌍'}</span>
          </div>
        </div>

        <div className="flex bg-gray-900 rounded-xl p-1 gap-1">
          {(['leaderboard', 'chat', 'members'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === 'chat') fetchMessages() }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}>
              {t === 'leaderboard' ? '🏆 Leaderboard' : t === 'chat' ? '💬 Chat' : '👥 Members'}
            </button>
          ))}
        </div>

        {tab === 'leaderboard' && (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
            <p className="text-gray-500 text-sm">Ranked by calories logged today</p>
            {sortedMembers.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No members found</div>
            ) : sortedMembers.map((member, i) => {
              const isMe = member.user_id === user?.id
              const progress = Math.min((member.todayCalories / member.dailyTarget) * 100, 100)
              return (
                <div key={member.user_id} className={`flex items-center gap-4 p-4 rounded-xl ${isMe ? 'bg-green-950 border border-green-800' : 'bg-gray-800'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-orange-600 text-black' : 'bg-gray-700 text-gray-400'}`}>{i + 1}</div>
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
                    {member.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{member.username}</span>
                      {isMe && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">You</span>}
                      {member.user_id === group.creator_id && <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-0.5 rounded-full">👑</span>}
                      {activeMutes.find(m => m.user_id === member.user_id) && <span className="text-xs bg-yellow-950 text-yellow-500 px-2 py-0.5 rounded-full">🔇 Muted</span>}
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                      <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-green-400">{member.todayCalories} kcal</div>
                    <div className="text-gray-500 text-xs">{member.todayCalories >= member.dailyTarget * 0.5 ? '✓ On track' : 'Behind'}</div>
                  </div>
                  {member.workoutsToday > 0 && <div className="text-xs bg-blue-900 text-blue-400 px-2 py-1 rounded-full">💪</div>}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'members' && (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-3">
            <h3 className="font-semibold">All Members</h3>
            {members.map(member => {
              const isMe = member.user_id === user?.id
              const isMuted = activeMutes.find(m => m.user_id === member.user_id)
              return (
                <div key={member.user_id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                      {member.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {member.username}
                        {isMe && <span className="text-xs text-gray-500">(you)</span>}
                        {member.user_id === group.creator_id && <span className="text-xs bg-yellow-900 text-yellow-400 px-1.5 py-0.5 rounded-full">👑</span>}
                        {isMuted && <span className="text-xs bg-yellow-950 text-yellow-500 px-1.5 py-0.5 rounded-full">🔇</span>}
                      </div>
                      <div className="text-gray-500 text-xs">{member.todayCalories} kcal today</div>
                    </div>
                  </div>
                  {isAdmin && !isMe && (
                    <div className="flex gap-2">
                      {isMuted ? (
                        <button onClick={() => unmuteMember(member.user_id)} className="text-xs bg-yellow-950 text-yellow-400 px-3 py-1 rounded-lg">Unmute</button>
                      ) : (
                        <button onClick={() => setMuteModal(member)} className="text-xs bg-yellow-950 hover:bg-yellow-900 text-yellow-400 px-3 py-1 rounded-lg">Mute</button>
                      )}
                      <button onClick={() => kickMember(member.user_id, member.username)} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-lg">Kick</button>
                      <button onClick={() => setBanModal(member)} className="text-xs bg-red-950 hover:bg-red-900 text-red-400 px-3 py-1 rounded-lg">Ban</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'chat' && (
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            {pinnedMessages.length > 0 && (
              <div className="border-b border-gray-800 bg-yellow-950/30 p-3">
                <div className="text-yellow-400 text-xs font-semibold mb-1">📌 Pinned</div>
                {pinnedMessages.map(msg => (
                  <div key={msg.id} className="text-gray-300 text-sm">{msg.content}</div>
                ))}
              </div>
            )}
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">Group Chat</h3>
              <p className="text-gray-500 text-xs">Messages are automatically moderated</p>
            </div>
            <div className="h-96 overflow-y-auto p-4 space-y-3">
              {messages.filter(m => !m.is_pinned).length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">No messages yet. Say hi!</div>
              ) : messages.filter(m => !m.is_pinned).map(msg => {
                const isMe = msg.user_id === user?.id
                const canDelete = isMe || isAdmin
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
                      {msg.profile?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className={`max-w-xs flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{msg.profile?.username || 'User'}</span>
                        <span className="text-xs text-gray-600">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {canDelete && <button onClick={() => deleteMessage(msg.id)} className="text-gray-600 hover:text-red-400 text-xs">{isAdmin && !isMe ? '🛡️' : '✕'}</button>}
                        {isAdmin && <button onClick={() => pinMessage(msg.id, msg.is_pinned)} className="text-gray-600 hover:text-yellow-400 text-xs">📌</button>}
                      </div>
                      <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-green-500 text-black rounded-tr-sm' : 'bg-gray-800 text-white rounded-tl-sm'}`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <div className="p-4 border-t border-gray-800 flex gap-3">
              <input
                type="text"
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600 text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !messageInput.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-semibold px-4 py-2 rounded-xl transition-all text-sm"
              >
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}