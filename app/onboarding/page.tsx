'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const steps = ['name', 'age', 'body', 'activity', 'goal', 'muscles']

const activityLevels = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise', multiplier: 1.2 },
  { id: 'light', label: 'Lightly Active', desc: '1-3 days/week', multiplier: 1.375 },
  { id: 'moderate', label: 'Moderately Active', desc: '3-5 days/week', multiplier: 1.55 },
  { id: 'very', label: 'Very Active', desc: '6-7 days/week', multiplier: 1.725 },
  { id: 'athlete', label: 'Athlete', desc: 'Twice per day', multiplier: 1.9 },
]

const goals = [
  { id: 'lose', label: 'Lose Fat', desc: 'Burn fat while preserving muscle', emoji: '🔥', adjustment: -500 },
  { id: 'maintain', label: 'Maintain', desc: 'Stay at your current weight', emoji: '⚖️', adjustment: 0 },
  { id: 'gain', label: 'Build Muscle', desc: 'Gain muscle and strength', emoji: '💪', adjustment: 300 },
]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState('forward')
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState({
    username: '',
    age: '',
    gender: 'male',
    height: '',
    weight: '',
    activity: '',
    goal: '',
  })
  const [bmr, setBmr] = useState(0)
  const [tdee, setTdee] = useState(0)
  const [targetCalories, setTargetCalories] = useState(0)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/')
      else {
        setUser(user)
        setForm(f => ({ ...f, username: user.user_metadata?.full_name?.split(' ')[0] || '' }))
      }
    })
  }, [])

  useEffect(() => {
    if (form.weight && form.height && form.age) {
      const w = parseFloat(form.weight)
      const h = parseFloat(form.height)
      const a = parseFloat(form.age)
      const calculatedBmr = form.gender === 'male'
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161
      setBmr(Math.round(calculatedBmr))

      if (form.activity) {
        const multiplier = activityLevels.find(l => l.id === form.activity)?.multiplier || 1.2
        const calculatedTdee = Math.round(calculatedBmr * multiplier)
        setTdee(calculatedTdee)

        if (form.goal) {
          const adjustment = goals.find(g => g.id === form.goal)?.adjustment || 0
          setTargetCalories(calculatedTdee + adjustment)
        }
      }
    }
  }, [form])

  const next = () => {
    setDirection('forward')
    setStep(s => Math.min(s + 1, steps.length - 1))
  }

  const back = () => {
    setDirection('back')
    setStep(s => Math.max(s - 1, 0))
  }

  const finish = async () => {
    if (!user) return
    const proteinTarget = form.goal === 'gain' ? Math.round(parseFloat(form.weight) * 2.2) : Math.round(parseFloat(form.weight) * 1.8)
    await supabase.from('profiles').upsert({
      id: user.id,
      username: form.username,
      age: parseInt(form.age),
      gender: form.gender,
      height: parseFloat(form.height),
      weight: parseFloat(form.weight),
      fitness_level: 'Beginner',
      goals: {
        goal_type: form.goal,
        daily_calories: targetCalories,
        protein_target: proteinTarget,
        water_target_ml: 2500,
      },
    })
    router.push('/dashboard')
  }

  const canProceed = () => {
    if (steps[step] === 'name') return form.username.trim().length > 0
    if (steps[step] === 'age') return form.age && parseInt(form.age) > 0
    if (steps[step] === 'body') return form.height && form.weight
    if (steps[step] === 'activity') return form.activity !== ''
    if (steps[step] === 'goal') return form.goal !== ''
    return true
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8">

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Step {step + 1} of {steps.length}</span>
            <span>{Math.round(((step + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div
              className="bg-green-400 h-1 rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step: Name */}
        {steps[step] === 'name' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">What should we call you?</h1>
              <p className="text-gray-400">This is how AuraHealth will greet you every day.</p>
            </div>
            <input
              autoFocus
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && canProceed() && next()}
              placeholder="Your first name"
              className="w-full bg-gray-900 text-white text-2xl rounded-2xl px-6 py-5 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
            />
          </div>
        )}

        {/* Step: Age */}
        {steps[step] === 'age' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">How old are you, {form.username}?</h1>
              <p className="text-gray-400">We use this to calculate your metabolism accurately.</p>
            </div>
            <div className="space-y-4">
              <input
                autoFocus
                type="number"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && canProceed() && next()}
                placeholder="Your age"
                className="w-full bg-gray-900 text-white text-2xl rounded-2xl px-6 py-5 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
              />
              <div className="flex gap-3">
                {['male', 'female'].map(g => (
                  <button
                    key={g}
                    onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className={`flex-1 py-3 rounded-xl font-semibold capitalize transition-all ${
                      form.gender === g
                        ? 'bg-green-500 text-black'
                        : 'bg-gray-900 text-gray-400 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step: Body */}
        {steps[step] === 'body' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">Your body stats</h1>
              <p className="text-gray-400">Used to calculate your exact calorie needs.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-400 text-sm">Height (cm)</label>
                <input
                  type="number"
                  value={form.height}
                  onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                  placeholder="e.g. 175"
                  className="w-full bg-gray-900 text-white text-2xl rounded-2xl px-6 py-5 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 text-sm">Weight (kg)</label>
                <input
                  type="number"
                  value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                  placeholder="e.g. 70"
                  className="w-full bg-gray-900 text-white text-2xl rounded-2xl px-6 py-5 outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-600"
                />
              </div>
              {bmr > 0 && (
                <div className="bg-green-950 border border-green-800 rounded-2xl p-4">
                  <p className="text-green-400 text-sm font-semibold">Live Calculation</p>
                  <p className="text-white text-lg mt-1">Your base metabolism burns <span className="text-green-400 font-bold">{bmr} kcal</span> per day at rest.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Activity */}
        {steps[step] === 'activity' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">How active are you?</h1>
              <p className="text-gray-400">Be honest — this directly affects your calorie targets.</p>
            </div>
            <div className="space-y-3">
              {activityLevels.map(level => (
                <button
                  key={level.id}
                  onClick={() => setForm(f => ({ ...f, activity: level.id }))}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    form.activity === level.id
                      ? 'border-green-500 bg-green-950'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <div className="font-semibold">{level.label}</div>
                  <div className="text-gray-400 text-sm">{level.desc}</div>
                  {form.activity === level.id && tdee > 0 && (
                    <div className="text-green-400 text-sm mt-1 font-semibold">Your TDEE: {tdee} kcal/day</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Goal */}
        {steps[step] === 'goal' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">What is your goal?</h1>
              <p className="text-gray-400">We will customize everything around this.</p>
            </div>
            <div className="space-y-3">
              {goals.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => setForm(f => ({ ...f, goal: goal.id }))}
                  className={`w-full text-left p-5 rounded-2xl border transition-all ${
                    form.goal === goal.id
                      ? 'border-green-500 bg-green-950'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{goal.emoji}</span>
                    <div>
                      <div className="font-bold text-lg">{goal.label}</div>
                      <div className="text-gray-400 text-sm">{goal.desc}</div>
                    </div>
                  </div>
                  {form.goal === goal.id && targetCalories > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-800">
                      <p className="text-green-400 font-semibold">Your daily target: {targetCalories} kcal</p>
                      <p className="text-gray-400 text-sm mt-1">Based on your body stats and activity level</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={back}
              className="px-6 py-4 rounded-2xl bg-gray-900 text-gray-400 hover:text-white transition-all"
            >
              ← Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={next}
              disabled={!canProceed()}
              className="flex-1 py-4 rounded-2xl bg-green-500 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-bold text-lg transition-all"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={!canProceed()}
              className="flex-1 py-4 rounded-2xl bg-green-500 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-bold text-lg transition-all"
            >
              Start My Journey 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  )
}