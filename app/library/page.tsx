'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Library() {
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState<'exercises' | 'recipes'>('exercises')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setUser(user)
    })
  }, [router])

  useEffect(() => {
    fetchItems()
    setFilter('all')
  }, [tab])

  const fetchItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('library_content')
      .select('*')
      .eq('type', tab === 'exercises' ? 'exercise' : 'recipe')
    if (data) setItems(data)
    setLoading(false)
  }

  const exerciseFilters = ['all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'no equipment']
  const recipeFilters = ['all', 'high protein', 'low carb', 'vegan', 'breakfast', 'lunch', 'dinner', 'under 15 mins']

  const filters = tab === 'exercises' ? exerciseFilters : recipeFilters
  const filtered = filter === 'all' ? items : items.filter(i => i.tags?.includes(filter))

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Library</h1>
          <p className="text-gray-400 mt-1">Browse exercises and recipes</p>
        </div>

        <div className="flex bg-gray-900 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('exercises')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'exercises' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            💪 Exercises
          </button>
          <button
            onClick={() => setTab('recipes')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'recipes' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            🥗 Recipes
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-green-500 text-black' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-900 rounded-2xl h-36"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((item) => (
              <Link href={`/${tab === 'exercises' ? 'exercises' : 'recipes'}/${item.id}`} key={item.id}>
                <div className="bg-gray-900 rounded-2xl p-5 space-y-3 hover:border-green-800 border border-transparent transition-all cursor-pointer h-full">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold">{item.title}</h3>
                    <span className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-400 flex-shrink-0 ml-2">
                      {tab === 'exercises' ? item.data_points?.difficulty : item.data_points?.prep_time}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{item.short_desc}</p>
                  {tab === 'recipes' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">{item.data_points?.calories} kcal</span>
                      <span className="text-blue-400">{item.data_points?.protein}g protein</span>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {item.tags?.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded-full capitalize">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}