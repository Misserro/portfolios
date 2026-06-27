import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // BetterAuth prefixes the cookie with __Secure- on HTTPS (production).
    // The pg driver can't run in the Edge runtime, so we check the cookie
    // presence here; actual session validation happens server-side per route.
    const hasSession =
      request.cookies.has("__Secure-better-auth.session_token") ||
      request.cookies.has("better-auth.session_token")

    if (!hasSession) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
