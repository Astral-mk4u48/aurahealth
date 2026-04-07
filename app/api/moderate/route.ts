import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { text } = await request.json()

  try {
    const res = await fetch('https://vector.profanity.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })
    const data = await res.json()
    return NextResponse.json({ 
      isProfanity: data.isProfanity || false,
      score: data.score || 0
    })
  } catch {
    return NextResponse.json({ isProfanity: false, score: 0 })
  }
}