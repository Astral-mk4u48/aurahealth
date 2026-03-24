import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { exercise, instructions } = await request.json()

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Based on the exercise "${exercise}" with instructions: "${instructions}", suggest a harder variation. Keep it to 3-4 sentences. Just describe the variation directly, no intro phrases.`
          }]
        }]
      })
    }
  )

  const data = await response.json()
  const variation = data.candidates[0].content.parts[0].text.trim()
  return NextResponse.json({ variation })
}