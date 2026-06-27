import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { url } = await request.json() as { url: string }
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 })

  let raw: string
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; sfer-portfolio-bot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    raw = await res.text()
  } catch (e) {
    return NextResponse.json({ error: `Could not fetch: ${(e as Error).message}` }, { status: 422 })
  }

  // Pull title and meta description before stripping tags
  const title = raw.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ""
  const metaDesc = raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1]?.trim() ?? ""

  // Remove elements that add noise — scripts, styles, svg, nav, footer, header
  let cleaned = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<(nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")

  // Strip remaining tags, collapse whitespace
  const text = cleaned
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 12_000) // cap to avoid token overflow

  const summary = [
    title      ? `Title: ${title}`       : "",
    metaDesc   ? `Description: ${metaDesc}` : "",
    `\n${text}`,
  ].filter(Boolean).join("\n")

  return NextResponse.json({ text: summary, title, url })
}
