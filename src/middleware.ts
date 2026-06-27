import { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Use a fetch to the BetterAuth session endpoint rather than importing `auth`
    // directly — the `pg` driver uses Node.js native modules that crash the Edge runtime.
    try {
      const sessionUrl = new URL("/api/auth/get-session", request.url)
      const res = await fetch(sessionUrl, { headers: request.headers })
      if (res.ok) {
        const data = await res.json()
        if (data?.user) return NextResponse.next()
      }
    } catch {
      // fall through to redirect
    }
    return NextResponse.redirect(new URL("/", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
