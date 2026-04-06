'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Social() {
  const [user, setUser] = useState<any>(null)
  const [myGroups, setMyGroups] = useState<any[]>([])
  const [publicGroups, setPublicGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'mygroups' | 'discover' | 'join'>('mygroups')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')
  const [joining, setJoining] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', description: '', is_private: false })
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await Promise.all([fetchMyGroups(user.id), fetchPublicGroups()])
      setLoading(false)
    }
    getData()
  }, [router])

  const fetchMyGroups = async (userId: string) => {
  const { data: memberData } = await supabase
    .from('group_members')
    .select('group_id, joined_at')
    .eq('user_id', userId)

  if (!memberData || memberData.length === 0) {
    setMyGroups([])
    return
  }

  const groupIds = memberData.map(m => m.group_id)
  const { data: groupData } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)

  if (groupData) {
    const combined = memberData.map(m => ({
      ...m,
      groups: groupData.find(g => g.id === m.group_id)
    }))
    setMyGroups(combined)
  }
}

  const fetchPublicGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(20)
    console.log('Public groups:', data, error)
    if (data) setPublicGroups(data)
  }

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const createGroup = async () => {
    if (!newGroup.name.trim() || !user) return
    setCreating(true)
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: newGroup.name,
        description: newGroup.description,
        creator_id: user.id,
        code: generateCode(),
        is_private: newGroup.is_private,
      })
      .select()
      .single()

    console.log('Created group:', data, error)

    if (data) {
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: data.id, user_id: user.id })
      console.log('Added as member:', memberError)
      setNewGroup({ name: '', description: '', is_private: false })
      await fetchMyGroups(user.id)
      await fetchPublicGroups()
      setTab('mygroups')
    }
    setCreating(false)
  }

  const joinGroupByCode = async () => {
    if (!joinCode.trim() || !user) return
    setJoinError('')
    setJoinSuccess('')

    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('code', joinCode.toUpperCase().trim())
      .single()

    console.log('Found group:', group, error)

    if (!group) { setJoinError('Group not found. Check the code and try again.'); return }

    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single()

    if (existing) { setJoinError('You are already in this group!'); return }

    const { error: joinError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id })

    if (joinError) { setJoinError('Failed to join. Try again.'); return }

    setJoinSuccess(`Joined "${group.name}" successfully!`)
    setJoinCode('')
    await fetchMyGroups(user.id)
  }

  const joinPublicGroup = async (groupId: string, groupName: string) => {
    if (!user) return
    setJoining(groupId)

    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id })
      await fetchMyGroups(user.id)
    }
    setJoining(null)
    router.push(`/social/groups/${groupId}`)
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Social</h1>
          <p className="text-gray-400 mt-1">Stay accountable with friends and groups</p>
        </div>

        <div className="flex bg-gray-900 rounded-xl p-1 w-fit gap-1">
          {(['mygroups', 'discover', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}
            >
              {t === 'mygroups' ? '👥 My Groups' : t === 'discover' ? '🌍 Discover' : '+ Join / Create'}
            </button>
          ))}
        </div>

        {tab === 'mygroups' && (
          <div className="space-y-4">
            {myGroups.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-xl">No groups yet</p>
                <p className="text-sm mt-2">Join or create a group to stay accountable</p>
                <button onClick={() => setTab('join')} className="mt-4 bg-green-500 text-black font-semibold px-6 py-3 rounded-xl">
                  Get Started
                </button>
              </div>
            ) : (
              myGroups.map((member: any) => (
                <Link href={`/social/groups/${member.group_id}`} key={member.group_id}>
                  <div className="bg-gray-900 rounded-2xl p-6 hover:border-green-800 border border-transparent transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{member.groups?.name}</h3>
                        <p className="text-gray-400 text-sm mt-1">{member.groups?.description || 'No description'}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400">
                          {member.groups?.is_private ? '🔒 Private' : '🌍 Public'}
                        </div>
                        <div className="text-xs text-gray-500">Code: {member.groups?.code}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === 'discover' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Public Groups</h2>
            {publicGroups.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No public groups yet. Create one!</div>
            ) : (
              publicGroups.map(group => {
                const isMember = myGroups.some((m: any) => m.group_id === group.id)
                return (
                  <div key={group.id} className="bg-gray-900 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{group.name}</h3>
                      <p className="text-gray-400 text-sm">{group.description || 'No description'}</p>
                    </div>
                    {isMember ? (
                      <Link href={`/social/groups/${group.id}`}>
                        <button className="bg-green-500 text-black font-semibold px-4 py-2 rounded-xl text-sm">View</button>
                      </Link>
                    ) : (
                      <button
                        onClick={() => joinPublicGroup(group.id, group.name)}
                        disabled={joining === group.id}
                        className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                      >
                        {joining === group.id ? 'Joining...' : 'Join'}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'join' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">Join with Code</h2>
              <p className="text-gray-400 text-sm">Enter a group code shared by a friend</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter code e.g. ABC123"
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
                />
                <button
                  onClick={joinGroupByCode}
                  className="bg-green-500 hover:bg-green-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
                >
                  Join
                </button>
              </div>
              {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
              {joinSuccess && <p className="text-green-400 text-sm">{joinSuccess}</p>}
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">Create a Group</h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-gray-400 text-sm">Group Name</label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={e => setNewGroup(g => ({ ...g, name: e.target.value }))}
                    placeholder="e.g. Morning Grinders"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-400 text-sm">Description (optional)</label>
                  <input
                    type="text"
                    value={newGroup.description}
                    onChange={e => setNewGroup(g => ({ ...g, description: e.target.value }))}
                    placeholder="What is this group about?"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setNewGroup(g => ({ ...g, is_private: !g.is_private }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${newGroup.is_private ? 'bg-green-500' : 'bg-gray-700'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-all absolute top-0.5 ${newGroup.is_private ? 'left-6' : 'left-0.5'}`}></div>
                  </button>
                  <span className="text-gray-400 text-sm">{newGroup.is_private ? '🔒 Private — invite only' : '🌍 Public — anyone can join'}</span>
                </div>
              </div>
              <button
                onClick={createGroup}
                disabled={creating || !newGroup.name.trim()}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold py-3 rounded-xl transition-all"
              >
                {creating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}