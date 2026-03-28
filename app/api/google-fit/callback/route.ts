import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const userId = url.searchParams.get('state')

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_FIT_CLIENT_ID!,
      client_secret: process.env.GOOGLE_FIT_CLIENT_SECRET!,
      redirect_uri: 'https://myaurahealth.vercel.app/api/google-fit/callback',
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  console.log('Tokens received:', tokens.access_token ? 'yes' : 'no', tokens.error || '')
  console.log('User ID from state:', userId)

  if (tokens.access_token && userId) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('profiles')
      .update({
        google_fit_access_token: tokens.access_token,
        google_fit_refresh_token: tokens.refresh_token || null,
      })
      .eq('id', userId)

    console.log('Update error:', error?.message || 'none')
  }

  return NextResponse.redirect(new URL('/dashboard?fit=connected', request.url))
}
