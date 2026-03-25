import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { recipe, ingredient, macros } = await request.json()

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `For the recipe "${recipe}" with macros (${macros?.calories} kcal, ${macros?.protein}g protein, ${macros?.carbs}g carbs, ${macros?.fat}g fat), the user says: "${ingredient}".

Suggest a practical ingredient substitute that maintains a similar macro profile. Keep your response to 2-3 sentences. Be specific about quantities and how it affects the macros.`
          }]
        }]
      })
    }
  )

  const data = await response.json()
  const swap = data.candidates[0].content.parts[0].text.trim()
  return NextResponse.json({ swap })
}