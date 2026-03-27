'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AICoach() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setUser(user)
      setProfile(profile)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data: logs } = await supabase
        .from('logs_intake')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())

      const totalCalories = logs?.reduce((a, l) => a + (l.macros?.calories || 0), 0) || 0
      const totalProtein = logs?.reduce((a, l) => a + (l.macros?.protein || 0), 0) || 0
      const name = user.user_metadata?.full_name?.split(' ')[0] || 'there'

      setMessages([{
        role: 'assistant',
        content: `Hey ${name}! I'm your personal AI health coach. Today you've had ${totalCalories} calories and ${totalProtein}g of protein. Your daily target is ${profile?.goals?.daily_calories || 2000} calories. What can I help you with?`
      }])
      setPageLoading(false)
    }
    getData()
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: messages,
        profile: {
          name: user?.user_metadata?.full_name?.split(' ')[0],
          goal: profile?.goals?.goal_type,
          dailyCalories: profile?.goals?.daily_calories,
          proteinTarget: profile?.goals?.protein_target,
          weight: profile?.weight,
        }
      })
    })

    const data = await res.json()
    setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    setLoading(false)
  }

  const suggestions = [
    "What should I eat for dinner?",
    "How do I build muscle faster?",
    "Am I on track with my goals?",
    "Give me a quick high protein snack idea",
  ]

  if (pageLoading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white flex flex-col" style={{ height: 'calc(100vh - 57px)' }}>
      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-xl">🤖</div>
        <div>
          <h1 className="font-bold text-lg">AI Health Coach</h1>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-xs">Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0 mt-1">🤖</div>
            )}
            <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-green-500 text-black font-medium rounded-br-sm'
                : 'bg-gray-900 text-gray-200 border border-gray-800 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">🤖</div>
            <div className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-6 py-2 flex gap-2 flex-wrap">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => { setInput(s); }}
              className="bg-gray-900 border border-gray-800 hover:border-green-800 text-gray-400 hover:text-white text-xs px-3 py-2 rounded-full transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-gray-800 px-6 py-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask your AI health coach anything..."
            className="flex-1 bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600 text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-800 text-black font-bold px-6 py-3 rounded-xl transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  )
}