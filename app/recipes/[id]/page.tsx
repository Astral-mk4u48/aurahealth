'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function RecipeDetail() {
  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [servings, setServings] = useState(1)
  const [swapIngredient, setSwapIngredient] = useState('')
  const [swapResult, setSwapResult] = useState('')
  const [swapping, setSwapping] = useState(false)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/')
      else setUser(user)
    })
    fetchRecipe()
  }, [])

  const fetchRecipe = async () => {
    const { data } = await supabase
      .from('library_content')
      .select('*')
      .eq('id', params.id)
      .single()
    if (data) setRecipe(data)
    setLoading(false)
  }

  const saveRecipe = async () => {
    if (!user) return
    await supabase.from('user_favorites').insert({
      user_id: user.id,
      content_id: recipe.id
    })
    setSaved(true)
  }

  const logMeal = async () => {
    if (!user) return
    await supabase.from('logs_intake').insert({
      user_id: user.id,
      entry_type: 'food',
      display_name: recipe.title,
      amount: servings,
      unit: 'serving',
      macros: {
        calories: Math.round(recipe.data_points?.calories * servings),
        protein: Math.round(recipe.data_points?.protein * servings),
        carbs: Math.round(recipe.data_points?.carbs * servings),
        fat: Math.round(recipe.data_points?.fat * servings),
        water_ml: 0,
      },
      is_ai_generated: false,
    })
    alert('Meal logged!')
  }

  const getSwap = async () => {
    if (!swapIngredient.trim()) return
    setSwapping(true)
    const res = await fetch('/api/ingredient-swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipe: recipe.title,
        ingredient: swapIngredient,
        macros: recipe.data_points,
      })
    })
    const data = await res.json()
    setSwapResult(data.swap)
    setSwapping(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  if (!recipe) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-red-400">Recipe not found</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2">
          Back
        </button>

        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            {recipe.tags?.map((tag: string) => (
              <span key={tag} className="text-xs bg-green-900 text-green-400 px-3 py-1 rounded-full capitalize">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-5xl font-bold">{recipe.title}</h1>
          <p className="text-gray-400 text-lg">{recipe.short_desc}</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-green-400 font-bold text-2xl">{Math.round(recipe.data_points?.calories * servings)}</div>
            <div className="text-gray-400 text-sm">kcal</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-blue-400 font-bold text-2xl">{Math.round(recipe.data_points?.protein * servings)}g</div>
            <div className="text-gray-400 text-sm">protein</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-yellow-400 font-bold text-2xl">{Math.round(recipe.data_points?.carbs * servings)}g</div>
            <div className="text-gray-400 text-sm">carbs</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-red-400 font-bold text-2xl">{Math.round(recipe.data_points?.fat * servings)}g</div>
            <div className="text-gray-400 text-sm">fat</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Servings</h2>
            <div className="flex items-center gap-4">
              <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600">-</button>
              <span className="text-xl font-bold">{servings}</span>
              <button onClick={() => setServings(servings + 1)} className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600">+</button>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Adjust servings to automatically scale nutrition info above</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">Instructions</h2>
          <div className="text-gray-300 leading-relaxed whitespace-pre-line">
            {recipe.long_content}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">Details</h2>
          <div className="flex items-center gap-2 text-gray-300">
            <span>Prep time: {recipe.data_points?.prep_time}</span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-yellow-900">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-semibold">🔄 AI Ingredient Swap</span>
          </div>
          <p className="text-gray-400 text-sm">Missing an ingredient? Tell us what you don't have and we'll suggest a substitute that maintains the macro profile.</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={swapIngredient}
              onChange={e => setSwapIngredient(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && getSwap()}
              placeholder="e.g. I don't have greek yogurt..."
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-500"
            />
            <button
              onClick={getSwap}
              disabled={swapping}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 text-black font-semibold px-6 py-3 rounded-xl transition-all"
            >
              {swapping ? '...' : 'Swap'}
            </button>
          </div>
          {swapResult && (
            <div className="bg-gray-800 rounded-xl p-4 border border-yellow-800">
              <p className="text-yellow-400 font-semibold mb-2">AI Suggestion:</p>
              <p className="text-gray-300 leading-relaxed">{swapResult}</p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={logMeal}
            className="flex-1 bg-green-500 hover:bg-green-600 text-black font-semibold py-4 rounded-xl transition-all"
          >
            + Log This Meal
          </button>
          <button
            onClick={saveRecipe}
            disabled={saved}
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-600 text-white font-semibold py-4 rounded-xl transition-all"
          >
            {saved ? 'Saved!' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </main>
  )
}