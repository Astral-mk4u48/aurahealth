'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Exercises() {
  const [user, setUser] = useState<any>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/')
      else setUser(user)
    })
    fetchExercises()
  }, [])

  const fetchExercises = async () => {
    const { data } = await supabase
      .from('library_content')
      .select('*')
      .eq('type', 'exercise')
    if (data) setExercises(data)
  }

  const muscles = ['all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core']

  const filtered = filter === 'all'
    ? exercises
    : exercises.filter(e => e.tags?.includes(filter))

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Exercise Encyclopedia</h1>
          <p className="text-gray-400 mt-1">Browse and filter exercises by muscle group</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {muscles.map((muscle) => (
            <button
              key={muscle}
              onClick={() => setFilter(muscle)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                filter === muscle
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {muscle}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">💪</div>
            <p className="text-xl">No exercises yet</p>
            <p className="text-sm mt-2">Exercises will appear here once added to the database</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((exercise) => (
              <Link href={`/exercises/${exercise.id}`} key={exercise.id}>
                <div className="bg-gray-900 rounded-2xl p-6 space-y-3 hover:border-green-800 border border-transparent transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-lg">{exercise.title}</h3>
                    <span className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-400">
                      {exercise.data_points?.difficulty || 'Beginner'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{exercise.short_desc}</p>
                  <div className="flex gap-2 flex-wrap">
                    {exercise.tags?.map((tag: string) => (
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