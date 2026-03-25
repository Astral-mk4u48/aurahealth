'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Search() {
  const [user, setUser] = useState<any>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/')
      else setUser(user)
    })
  }, [router])

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    const { data } = await supabase
      .from('library_content')
      .select('*')
      .or(`title.ilike.%${query}%,short_desc.ilike.%${query}%,tags.cs.{${query.toLowerCase()}}`)
      .limit(30)
    if (data) setResults(data)
    setLoading(false)
  }

  const exercises = results.filter(r => r.type === 'exercise')
  const recipes = results.filter(r => r.type === 'recipe')

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Search</h1>
          <p className="text-gray-400 mt-1">Find exercises and recipes</p>
        </div>

        <div className="flex gap-3">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search for chest exercises, high protein recipes..."
            className="flex-1 bg-gray-900 text-white rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500 text-lg"
          />
          <button
            onClick={search}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-semibold px-8 py-4 rounded-xl transition-all"
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>

        {!searched && (
          <div className="grid grid-cols-3 gap-3">
            {['chest', 'legs', 'high protein', 'vegan', 'under 15 mins', 'no equipment'].map(tag => (
              <button
                key={tag}
                onClick={() => { setQuery(tag); setTimeout(search, 100) }}
                className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white py-3 px-4 rounded-xl text-sm font-medium capitalize transition-all border border-gray-800 hover:border-green-900"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-xl">No results for "{query}"</p>
            <p className="text-sm mt-2">Try a different search term</p>
          </div>
        )}

        {exercises.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">💪 Exercises ({exercises.length})</h2>
            <div className="grid grid-cols-2 gap-3">
              {exercises.map(exercise => (
                <Link href={`/exercises/${exercise.id}`} key={exercise.id}>
                  <div className="bg-gray-900 rounded-2xl p-5 space-y-2 hover:border-green-800 border border-transparent transition-all cursor-pointer">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold">{exercise.title}</h3>
                      <span className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-400">
                        {exercise.data_points?.difficulty}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{exercise.short_desc}</p>
                    <div className="flex gap-2 flex-wrap">
                      {exercise.tags?.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded-full capitalize">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {recipes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">🥗 Recipes ({recipes.length})</h2>
            <div className="grid grid-cols-2 gap-3">
              {recipes.map(recipe => (
                <Link href={`/recipes/${recipe.id}`} key={recipe.id}>
                  <div className="bg-gray-900 rounded-2xl p-5 space-y-2 hover:border-green-800 border border-transparent transition-all cursor-pointer">
                    <h3 className="font-bold">{recipe.title}</h3>
                    <p className="text-gray-400 text-sm">{recipe.short_desc}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">{recipe.data_points?.calories} kcal</span>
                      <span className="text-blue-400">{recipe.data_points?.protein}g protein</span>
                      <span className="text-gray-400">{recipe.data_points?.prep_time}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}