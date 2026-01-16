import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  // Handle different auth callback scenarios
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  const supabase = await createClient()

  // Email confirmation with token_hash
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return await redirectBasedOnUser(supabase, origin, next)
    }

    console.error('Email verification error:', error)
    return NextResponse.redirect(`${origin}/login?error=verification_failed`)
  }

  // OAuth or PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return await redirectBasedOnUser(supabase, origin, next)
    }

    console.error('Code exchange error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  // No valid params
  return NextResponse.redirect(`${origin}/login?error=missing_params`)
}

async function redirectBasedOnUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  origin: string,
  next: string
) {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_id', user.id)
      .single() as { data: { organization_id: string | null } | null }

    // If user already has an org, go to dashboard
    if (userData?.organization_id) {
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Otherwise go to onboarding
  return NextResponse.redirect(`${origin}${next}`)
}
