'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function ExerciseDetail() {
  const [exercise, setExercise] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiVariation, setAiVariation] = useState('')
  const [loadingVariation, setLoadingVariation] = useState(false)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/')
      else setUser(user)
    })
    fetchExercise()
  }, [])

  const fetchExercise = async () => {
    const { data } = await supabase
      .from('library_content')
      .select('*')
      .eq('id', params.id)
      .single()
    if (data) setExercise(data)
    setLoading(false)
  }

  const getVariation = async () => {
    setLoadingVariation(true)
    const res = await fetch('/api/ai-variation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise: exercise.title, instructions: exercise.long_content })
    })
    const data = await res.json()
    setAiVariation(data.variation)
    setLoadingVariation(false)
  }

  const saveExercise = async () => {
    if (!user) return
    await supabase.from('user_favorites').insert({
      user_id: user.id,
      content_id: exercise.id
    })
    setSaved(true)
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-green-400">Loading...</div>
    </div>
  )

  if (!exercise) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-2xl text-red-400">Exercise not found</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2">
          ← Back
        </button>

        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            {exercise.tags?.map((tag: string) => (
              <span key={tag} className="text-xs bg-green-900 text-green-400 px-3 py-1 rounded-full capitalize">
                {tag}
              </span>
            ))}
            <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full">
              {exercise.data_points?.difficulty}
            </span>
          </div>
          <h1 className="text-5xl font-bold">{exercise.title}</h1>
          <p className="text-gray-400 text-lg">{exercise.short_desc}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-gray-400 text-sm">Difficulty</div>
            <div className="font-semibold">{exercise.data_points?.difficulty}</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">🏋️</div>
            <div className="text-gray-400 text-sm">Equipment</div>
            <div className="font-semibold">{exercise.data_points?.equipment || 'None'}</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">💪</div>
            <div className="text-gray-400 text-sm">Muscle Group</div>
            <div className="font-semibold capitalize">{exercise.data_points?.muscle_groups?.[0]}</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">How To Do It</h2>
          <div className="text-gray-300 leading-relaxed whitespace-pre-line">
            {exercise.long_content}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">Common Mistakes</h2>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2"><span className="text-red-400 mt-1">✕</span> Rushing through reps without focusing on form</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-1">✕</span> Not breathing properly during the movement</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-1">✕</span> Using too much weight before mastering the technique</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-1">✕</span> Skipping warm up sets</li>
          </ul>
        </div>

        {aiVariation && (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-3 border border-green-900">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-green-400">AI</span> Variation
            </h2>
            <p className="text-gray-300 leading-relaxed">{aiVariation}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={getVariation}
            disabled={loadingVariation}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 rounded-xl transition-all"
          >
            {loadingVariation ? 'Generating...' : '🤖 Show me a harder variation'}
          </button>
          <button
            onClick={saveExercise}
            disabled={saved}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold py-4 rounded-xl transition-all"
          >
            {saved ? '✓ Saved!' : '+ Save to My Library'}
          </button>
        </div>
      </div>
    </main>
  )
}