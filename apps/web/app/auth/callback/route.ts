import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = await db()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session?.user) {
      // Sync user with profiles table to ensure it's up to date
      await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email,
        phone: session.user.phone,
        is_guest: session.user.email == null,
      }, {
        onConflict: 'id'
      })
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(next, request.url))
}
