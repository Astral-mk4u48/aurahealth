'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        doSearch(searchQuery)
      } else {
        setSearchResults([])
        setShowResults(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const doSearch = async (q: string) => {
    setSearching(true)
    const { data } = await supabase
      .from('library_content')
      .select('id, title, type, short_desc')
      .or(`title.ilike.%${q}%,short_desc.ilike.%${q}%,tags.cs.{${q.toLowerCase()}}`)
      .limit(6)
    if (data) setSearchResults(data)
    setShowResults(true)
    setSearching(false)
  }

  const hiddenPaths = ['/', '/login', '/onboarding']
  if (!user || hiddenPaths.includes(pathname)) return null

  const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/library', label: 'Library', icon: '📚' },
  { href: '/progress', label: 'Progress', icon: '📈' },
  { href: '/workouts', label: 'Workouts', icon: '🏋️' },
  { href: '/plan', label: 'Plan', icon: '📋' },
  { href: '/social', label: 'Social', icon: '👥' },
  { href: '/ai', label: 'AI Coach', icon: '🤖' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]


  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent flex-shrink-0">
          AuraHealth
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                pathname === link.href || pathname.startsWith(link.href + '/')
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex-1 relative" ref={searchRef}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setShowResults(true)}
              placeholder="Search exercises, recipes, muscles..."
              className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-xl pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 placeholder-gray-600 transition-all"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin block"></span>
              </span>
            )}
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    router.push(`/${result.type === 'exercise' ? 'exercises' : 'recipes'}/${result.id}`)
                    setShowResults(false)
                    setSearchQuery('')
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-all text-left"
                >
                  <span className="text-lg">{result.type === 'exercise' ? '💪' : '🥗'}</span>
                  <div>
                    <div className="text-white text-sm font-medium">{result.title}</div>
                    <div className="text-gray-500 text-xs">{result.type}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && searchQuery.length > 1 && searchResults.length === 0 && !searching && (
            <div className="absolute top-full mt-2 w-full bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-4 text-center text-gray-500 text-sm">
              No results for "{searchQuery}"
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-black text-xs font-bold">
              {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-white text-sm font-medium">
              {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}
            </span>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="text-gray-400 hover:text-white text-sm border border-gray-800 hover:border-gray-600 px-3 py-2 rounded-lg transition-all"
          >
            Sign Out
          </button>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-gray-400 hover:text-white p-2 flex-shrink-0"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/95 px-6 py-4 space-y-1">
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-xl pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-600"
            />
          </div>
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