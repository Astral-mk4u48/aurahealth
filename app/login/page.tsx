'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: username } }
      })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/onboarding')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()
        if (!profile) router.push('/onboarding')
        else router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-green-950 via-black to-black items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-500 rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-5"></div>
        <div className="relative z-10 max-w-md space-y-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">AuraHealth</h1>
            <p className="text-gray-400 mt-3 text-lg leading-relaxed">Your AI-powered personal health companion. Track smarter, not harder.</p>
          </div>
          <div className="space-y-4">
            {[
              { emoji: '🧠', title: 'AI Food Logger', desc: 'Just type what you ate in plain English' },
              { emoji: '💪', title: '400+ Exercises', desc: 'With form guides and AI variations' },
              { emoji: '📊', title: 'Weekly Reports', desc: 'AI-generated insights about your progress' },
              { emoji: '🥗', title: '500+ Recipes', desc: 'With AI ingredient swaps' },
            ].map(f => (
              <div key={f.title} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-950 border border-green-800 rounded-xl flex items-center justify-center text-xl flex-shrink-0">{f.emoji}</div>
                <div>
                  <div className="font-semibold text-white">{f.title}</div>
                  <div className="text-gray-500 text-sm">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">AuraHealth</h1>
          </div>

          <div>
            <h2 className="text-3xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <p className="text-gray-400 mt-1">{mode === 'login' ? 'Sign in to continue your journey' : 'Start your health journey today'}</p>
          </div>

          <div className="flex bg-gray-900 rounded-xl p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'signup' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-gray-400 text-sm">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-600 transition-all"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-gray-400 text-sm">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-600 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-gray-400 text-sm">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-600 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-950 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold py-3 rounded-xl transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black text-gray-500">or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-gray-900 border border-gray-800 hover:border-gray-600 text-white font-semibold py-3 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          <p className="text-center text-gray-600 text-xs">
            By continuing you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}