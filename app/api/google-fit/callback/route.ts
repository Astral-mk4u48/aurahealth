import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
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

  if (tokens.access_token) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    console.log('User found:', user?.id || 'none')

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({
          google_fit_access_token: tokens.access_token,
          google_fit_refresh_token: tokens.refresh_token || null,
        })
        .eq('id', user.id)
      
      console.log('Update error:', error?.message || 'none')
    }
  }

  return NextResponse.redirect(new URL('/dashboard?fit=connected', request.url))
}