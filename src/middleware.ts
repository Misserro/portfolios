import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // BetterAuth sets __Secure-better-auth.session_token on HTTPS.
    // Use the raw Cookie header string to avoid any prefix stripping
    // by the Next.js cookies API. The pg driver can't run in Edge runtime,
    // so actual session validation happens server-side per route.
    const cookieHeader = request.headers.get("cookie") ?? ""
    if (!cookieHeader.includes("better-auth.session_token=")) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
