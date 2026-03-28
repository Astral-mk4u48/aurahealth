import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID
  const redirectUri = 'https://myaurahealth.vercel.app/api/google-fit/callback'
  
  const scopes = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
    'https://www.googleapis.com/auth/fitness.body.read',
  ].join(' ')

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`

  return NextResponse.redirect(url)
}