'use client'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-950 via-black to-black"></div>
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500 rounded-full blur-3xl opacity-10"></div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="max-w-3xl w-full text-center space-y-12">

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-green-950 border border-green-800 text-green-400 text-sm px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              AI-Powered Health Tracking
            </div>
            <h1 className="text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">Your health,</span>
              <br />
              <span className="bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">reimagined.</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
              Just type what you ate. AuraHealth handles the rest — macros, insights, and a personal AI coach that actually knows you.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleGoogleLogin}
              className="group flex items-center gap-3 bg-white text-black font-semibold px-8 py-4 rounded-2xl hover:bg-gray-100 transition-all text-lg shadow-2xl shadow-white/10"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <p className="text-gray-600 text-sm">Free forever. No credit card required.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-left">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-3 hover:bg-white/8 transition-all">
              <div className="text-3xl">🧠</div>
              <div className="font-semibold text-white">AI Smart Logger</div>
              <div className="text-gray-400 text-sm leading-relaxed">Type anything in plain English. The AI figures out the macros instantly.</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-3 hover:bg-white/8 transition-all">
              <div className="text-3xl">💪</div>
              <div className="font-semibold text-white">400+ Exercises</div>
              <div className="text-gray-400 text-sm leading-relaxed">Every muscle group covered with form tips and AI-generated variations.</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-3 hover:bg-white/8 transition-all">
              <div className="text-3xl">🥗</div>
              <div className="font-semibold text-white">500+ Recipes</div>
              <div className="text-gray-400 text-sm leading-relaxed">High protein, low carb, vegan — with AI ingredient swaps on the fly.</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
            <span>✓ Personalized calorie targets</span>
            <span>✓ Weekly AI reports</span>
            <span>✓ Weight tracking</span>
          </div>
        </div>
      </div>
    </main>
  )
}