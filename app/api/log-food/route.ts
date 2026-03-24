import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { message } = await request.json()

  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 })
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a nutrition expert. The user says: "${message}". 
            Return ONLY a raw JSON object. No markdown. No backticks. No explanation. No newlines before or after. Start your response with { and end with }.
            Use this exact format with real estimated numbers:
            {"name": "2 Scrambled Eggs and Toast", "calories": 350, "protein": 18, "carbs": 30, "fat": 14, "water_ml": 0}`
          }]
        }],
        generationConfig: {
          temperature: 0.1
        }
      })
    }
  )

  const data = await response.json()
  
  if (!data.candidates || data.candidates.length === 0) {
    console.log('Gemini error:', JSON.stringify(data))
    return NextResponse.json({ error: 'Gemini API error', details: data }, { status: 500 })
  }

  let text = data.candidates[0].content.parts[0].text.trim()
  text = text.replace(/```json|```/g, '').trim()
  
  console.log('Gemini raw response:', text)
  
  try {
    const nutrition = JSON.parse(text)
    return NextResponse.json(nutrition)
  } catch {
    return NextResponse.json({ error: 'Could not parse food data', raw: text }, { status: 400 })
  }
}