'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  const hiddenPaths = ['/', '/login', '/onboarding']
  if (!user || hiddenPaths.includes(pathname)) return null

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/search', label: 'Search', icon: '🔍' },
    { href: '/exercises', label: 'Exercises', icon: '💪' },
    { href: '/recipes', label: 'Recipes', icon: '🥗' },
    { href: '/favorites', label: 'Favorites', icon: '⭐' },
    { href: '/history', label: 'History', icon: '📋' },
    { href: '/weight', label: 'Weight', icon: '⚖️' },
    { href: '/report', label: 'Report', icon: '📊' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent flex-shrink-0">
          AuraHealth
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === link.href
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-black text-xs font-bold">
              {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-white text-sm font-medium">
              {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}
            </span>
          </div>

          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="hidden md:block text-gray-400 hover:text-white text-sm border border-gray-800 hover:border-gray-600 px-3 py-2 rounded-lg transition-all"
          >
            Sign Out
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-400 hover:text-white p-2"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/95 px-6 py-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                pathname === link.href
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/50 transition-all"
          >
            Sign Out
          </button>
        </div>
      )}
    </nav>
  )
}