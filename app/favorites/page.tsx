'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Favorites() {
  const [user, setUser] = useState<any>(null)
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      await fetchFavorites(user.id)
      setLoading(false)
    }
    getData()
  }, [router])

  const fetchFavorites = async (userId: string) => {
    const { data } = await supabase
      .from('user_favorites')
      .select('*, content:content_id(*)')
      .eq('user_id', userId)
      .order('date_saved', { ascending: false })
    if (data) setFavorites(data)
  }

  const removeFavorite = async (contentId: string) => {
    if (!user) return
    await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', contentId)
    setFavorites(prev => prev.filter(f => f.content_id !== contentId))
  }

  const filtered = filter === 'all'
    ? favorites
    : favorites.filter(f => f.content?.type === filter)

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">My Favorites</h1>
          <p className="text-gray-400 mt-1">Your saved exercises and recipes</p>
        </div>

        <div className="flex gap-2">
          {['all', 'exercise', 'recipe'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'exercise' ? '💪 Exercises' : '🥗 Recipes'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">⭐</div>
            <p className="text-xl">No favorites yet</p>
            <p className="text-sm mt-2">Save exercises and recipes to see them here</p>
            <div className="flex gap-3 justify-center mt-6">
              <Link href="/exercises" className="bg-green-500 text-black font-semibold px-6 py-3 rounded-xl">
                Browse Exercises
              </Link>
              <Link href="/recipes" className="bg-gray-800 text-white font-semibold px-6 py-3 rounded-xl">
                Browse Recipes
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((fav) => (
              <div key={fav.content_id} className="bg-gray-900 rounded-2xl p-6 space-y-3 border border-transparent hover:border-green-900 transition-all">
                <div className="flex items-start justify-between">
                  <span className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-400 capitalize">
                    {fav.content?.type === 'exercise' ? '💪 Exercise' : '🥗 Recipe'}
                  </span>
                  <button
                    onClick={() => removeFavorite(fav.content_id)}
                    className="text-gray-600 hover:text-red-400 transition-all text-sm"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="font-bold text-lg">{fav.content?.title}</h3>
                <p className="text-gray-400 text-sm">{fav.content?.short_desc}</p>
                {fav.content?.type === 'recipe' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">{fav.content?.data_points?.calories} kcal</span>
                    <span className="text-blue-400">{fav.content?.data_points?.protein}g protein</span>
                  </div>
                )}
                {fav.content?.type === 'exercise' && (
                  <div className="text-sm text-gray-400">
                    {fav.content?.data_points?.difficulty} · {fav.content?.data_points?.equipment || 'No equipment'}
                  </div>
                )}
                <Link
                  href={`/${fav.content?.type === 'exercise' ? 'exercises' : 'recipes'}/${fav.content_id}`}
                  className="block w-full text-center bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 rounded-xl transition-all text-sm"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}