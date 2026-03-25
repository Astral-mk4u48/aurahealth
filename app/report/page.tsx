import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { name, summary, dailyCalories, proteinTarget, goalType } = await request.json()

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a personal health coach analyzing ${name}'s week. Their goal is to ${goalType === 'lose' ? 'lose fat' : goalType === 'gain' ? 'build muscle' : 'maintain weight'} with a daily target of ${dailyCalories} kcal and ${proteinTarget}g protein.

Here is their week:
${summary}

Write a personal, encouraging weekly analysis in 4-5 sentences. Include:
1. One specific "micro-win" they achieved
2. One specific area to improve with a concrete actionable tip
3. An encouraging closing line about their goal

Be specific, use their actual numbers, and sound like a knowledgeable friend not a robot.`
          }]
        }]
      })
    }
  )

  const data = await response.json()
  const report = data.candidates[0].content.parts[0].text.trim()
  return NextResponse.json({ report })
}