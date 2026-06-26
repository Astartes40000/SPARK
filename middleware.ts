import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for supabase auth token cookie
  const authCookie = request.cookies.get('sb-rdkchbzydnkqnaxjmphm-auth-token') ||
    request.cookies.getAll().find(c => c.name.includes('-auth-token'))

  const isProtected = pathname.startsWith('/dashboard')
  const isAuthPage = pathname === '/login' || pathname === '/register'

  if (!authCookie && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (authCookie && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
