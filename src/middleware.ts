import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Checking for the session cookie is Edge-safe.
    // The pg driver can't run here (node:util/types missing in Edge),
    // so we can't call auth.api.getSession(). The actual session is
    // validated server-side in each admin page and API route.
    const session = request.cookies.get("better-auth.session_token")
    if (!session?.value) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
