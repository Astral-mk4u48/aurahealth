'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function GroupPage() {
  const [user, setUser] = useState<any>(null)
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'leaderboard' | 'chat'>('leaderboard')
  const [showSettings, setShowSettings] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
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
      .channel('group-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${params.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchGroup = async (userId: string) => {
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', params.id)
      .single()
    if (group) {
      setGroup(group)
      setIsAdmin(group.creator_id === userId)
    }

    const { data: memberRows } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', params.id)

    if (!memberRows || memberRows.length === 0) { setMembers([]); return }

    const userIds = memberRows.map((m: any) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, goals')
      .in('id', userIds)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const membersWithStats = await Promise.all(memberRows.map(async (m: any) => {
      const profile = profiles?.find(p => p.id === m.user_id)
      const { data: logs } = await supabase
        .from('logs_intake').select('macros').eq('user_id', m.user_id).gte('created_at', today.toISOString())
      const todayCalories = logs?.reduce((a, l) => a + (l.macros?.calories || 0), 0) || 0
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
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || !user || sending) return
    setSending(true)
    const badWords = ['spam', 'hate', 'abuse']
    const hasBadWord = badWords.some(w => messageInput.toLowerCase().includes(w))
    if (hasBadWord) {
      alert('Your message contains inappropriate content.')
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

  const leaveGroup = async () => {
    if (!user || isAdmin) { alert('Admins cannot leave their own group. Delete it instead.'); return }
    if (!confirm('Are you sure you want to leave this group?')) return
    await supabase.from('group_members').delete().eq('group_id', params.id).eq('user_id', user.id)
    router.push('/social')
  }

  const deleteGroup = async () => {
    if (!user || !isAdmin) return
    if (!confirm('This will permanently delete the group, all messages and all data. Are you sure?')) return
    await supabase.from('group_messages').delete().eq('group_id', params.id)
    await supabase.from('group_members').delete().eq('group_id', params.id)
    await supabase.from('groups').delete().eq('id', params.id)
    router.push('/social')
  }

  const kickMember = async (memberId: string, memberName: string) => {
    if (!isAdmin) return
    if (!confirm(`Kick ${memberName} from the group?`)) return
    await supabase.from('group_members').delete().eq('group_id', params.id).eq('user_id', memberId)
    setMembers(prev => prev.filter(m => m.user_id !== memberId))
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
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm">
            ← Back
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-all"
          >
            ⚙️ Settings
          </button>
        </div>

        {showSettings && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg">Group Settings</h3>
            <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Invite Code</div>
                <div className="text-green-400 font-bold tracking-widest">{group.code}</div>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(group.code); alert('Code copied!') }}
                className="text-gray-400 hover:text-white text-sm bg-gray-700 px-3 py-1 rounded-lg"
              >
                Copy
              </button>
            </div>

            {isAdmin && (
              <>
                <div className="space-y-2">
                  <div className="text-gray-400 text-sm font-semibold">Members</div>
                  {members.map(m => (
                    <div key={m.user_id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-black text-sm font-bold">
                          {m.username?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{m.username}</span>
                        {m.user_id === group.creator_id && <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-0.5 rounded-full">👑 Admin</span>}
                      </div>
                      {m.user_id !== user?.id && (
                        <button
                          onClick={() => kickMember(m.user_id, m.username)}
                          className="text-red-400 hover:text-red-300 text-xs bg-red-950 px-3 py-1 rounded-lg"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={deleteGroup}
                  className="w-full bg-red-950 hover:bg-red-900 text-red-400 font-semibold py-3 rounded-xl transition-all border border-red-900"
                >
                  🗑️ Delete Group
                </button>
              </>
            )}

            {!isAdmin && (
              <button
                onClick={leaveGroup}
                className="w-full bg-gray-800 hover:bg-gray-700 text-red-400 font-semibold py-3 rounded-xl transition-all"
              >
                Leave Group
              </button>
            )}
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <div className="flex items-center gap-2">
              {isAdmin && <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-1 rounded-full">👑 Admin</span>}
              <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400">
                {group.is_private ? '🔒 Private' : '🌍 Public'}
              </span>
            </div>
          </div>
          <p className="text-gray-500 text-sm">{members.length} members</p>
        </div>

        <div className="flex bg-gray-900 rounded-xl p-1 w-fit gap-1">
          <button
            onClick={() => setTab('leaderboard')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'leaderboard' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => { setTab('chat'); fetchMessages() }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'chat' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            💬 Chat
          </button>
        </div>

        {tab === 'leaderboard' && (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
            <p className="text-gray-500 text-sm">Ranked by calories logged today</p>
            {sortedMembers.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No members found</div>
            ) : (
              sortedMembers.map((member, i) => {
                const isMe = member.user_id === user?.id
                const progress = Math.min((member.todayCalories / member.dailyTarget) * 100, 100)
                const onTrack = member.todayCalories >= member.dailyTarget * 0.5
                return (
                  <div key={member.user_id} className={`flex items-center gap-4 p-4 rounded-xl ${isMe ? 'bg-green-950 border border-green-800' : 'bg-gray-800'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-orange-600 text-black' : 'bg-gray-700 text-gray-400'}`}>
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
                      {member.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{member.username}</span>
                        {isMe && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">You</span>}
                        {member.user_id === group.creator_id && <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-0.5 rounded-full">👑</span>}
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
                      <div className="text-xs bg-blue-900 text-blue-400 px-2 py-1 rounded-full flex-shrink-0">💪</div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'chat' && (
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">Group Chat</h3>
              <p className="text-gray-500 text-xs">Be respectful. Messages are moderated.</p>
            </div>
            <div className="h-96 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">No messages yet. Say hi!</div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.user_id === user?.id
                  const canDelete = isMe || isAdmin
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
                        {msg.profile?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className={`max-w-xs ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{msg.profile?.username || 'User'}</span>
                          {canDelete && (
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="text-gray-600 hover:text-red-400 text-xs"
                            >
                              {isAdmin && !isMe ? '🛡️' : '✕'}
                            </button>
                          )}
                        </div>
                        <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-green-500 text-black rounded-tr-sm' : 'bg-gray-800 text-white rounded-tl-sm'}`}>
                          {msg.content}
                        </div>
                        <span className="text-xs text-gray-600">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>
            <div className="p-4 border-t border-gray-800 flex gap-3">
              <input
                type="text"
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600 text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !messageInput.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-semibold px-4 py-2 rounded-xl transition-all text-sm"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}