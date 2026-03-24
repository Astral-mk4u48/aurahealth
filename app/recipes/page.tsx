'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Recipes() {
  const [user, setUser] = useState<any>(null)
  const [recipes, setRecipes] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/')
      else setUser(user)
    })
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    const { data } = await supabase
      .from('library_content')
      .select('*')
      .eq('type', 'recipe')
    if (data) setRecipes(data)
  }

  const tags = ['all', 'high protein', 'low carb', 'vegan', 'under 15 mins', 'breakfast', 'lunch', 'dinner']

  const filtered = filter === 'all'
    ? recipes
    : recipes.filter(r => r.tags?.includes(filter))

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Recipe Vault</h1>
          <p className="text-gray-400 mt-1">High protein, low carb, and everything in between</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilter(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                filter === tag
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">🥗</div>
            <p className="text-xl">No recipes yet</p>
            <p className="text-sm mt-2">Recipes will appear here once added to the database</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((recipe) => (
              <Link href={`/recipes/${recipe.id}`} key={recipe.id}>
                <div className="bg-gray-900 rounded-2xl p-6 space-y-3 hover:border-green-800 border border-transparent transition-all cursor-pointer">
                  <h3 className="font-bold text-lg">{recipe.title}</h3>
                  <p className="text-gray-400 text-sm">{recipe.short_desc}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">{recipe.data_points?.calories} kcal</span>
                    <span className="text-blue-400">{recipe.data_points?.protein}g protein</span>
                    <span className="text-gray-400">{recipe.data_points?.prep_time}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {recipe.tags?.map((tag: string) => (
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