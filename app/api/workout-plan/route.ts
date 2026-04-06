import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { name, recentWorkouts, muscleFocus, goal, fitnessLevel } = await request.json()

  const workoutSummary = recentWorkouts.length > 0
    ? recentWorkouts.map((w: any) => `${w.name} (${w.type})`).join(', ')
    : 'No recent workouts'

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Create a personalized weekly workout plan for ${name}.
Goal: ${goal === 'lose' ? 'Fat loss' : goal === 'gain' ? 'Muscle building' : 'Maintenance'}
Fitness level: ${fitnessLevel || 'Beginner'}
Muscle focus: ${muscleFocus?.join(', ') || 'Full body'}
Recent workouts: ${workoutSummary}

Return ONLY a raw JSON object with no markdown. Format:
{
  "weekPlan": [
    {
      "day": "Monday",
      "focus": "Chest & Triceps",
      "exercises": [
        {"name": "Bench Press", "sets": 4, "reps": "8-10", "rest": "90s"},
        {"name": "Push Ups", "sets": 3, "reps": "15", "rest": "60s"}
      ],
      "estimatedTime": "45 mins",
      "intensity": "High"
    }
  ],
  "tips": ["tip1", "tip2", "tip3"],
  "weeklyGoal": "Brief goal statement"
}`
          }]
        }]
      })
    }
  )

  const data = await response.json()
  let text = data.candidates[0].content.parts[0].text.trim()
  text = text.replace(/```json|```/g, '').trim()
  const plan = JSON.parse(text)
  return NextResponse.json(plan)
}