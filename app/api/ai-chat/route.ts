import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { message, history, profile } = await request.json()

  const historyText = history
    .slice(-6)
    .map((m: any) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a friendly, knowledgeable personal health coach for ${profile?.name}. 
Their goal: ${profile?.goal === 'lose' ? 'lose fat' : profile?.goal === 'gain' ? 'build muscle' : 'maintain weight'}
Daily calorie target: ${profile?.dailyCalories} kcal
Protein target: ${profile?.proteinTarget}g
Current weight: ${profile?.weight}kg

Previous conversation:
${historyText}

User says: "${message}"

Reply in 2-3 sentences max. Be specific, friendly, and actionable. Use their actual numbers when relevant. Never use bullet points — just natural conversation.`
          }]
        }]
      })
    }
  )

  const data = await response.json()
  const reply = data.candidates[0].content.parts[0].text.trim()
  return NextResponse.json({ reply })
}