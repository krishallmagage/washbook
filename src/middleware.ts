import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase Auth session on every request.
 *
 * Server Components cannot write cookies, so without this a rotated refresh
 * token is never persisted and an Owner is silently signed out mid-shift. PIN
 * sessions are deliberately NOT refreshed here: US-10.3 AC2 requires them to
 * expire after an idle period, and sliding the expiry on every request would
 * mean a shared tablet left on the counter stays signed in all day.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url === undefined || key === undefined) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser() rather than getSession(): getSession trusts the cookie without
  // verifying it against the auth server, which is exactly the wrong thing to
  // rely on for an authorisation decision.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and images. The service worker and
     * manifest are excluded too — they must be reachable before sign-in or the
     * PWA cannot install (US-11.4 AC3).
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
}
