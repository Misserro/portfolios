import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { queryOne } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"
import type { AISession, AIMessage, MapContent } from "@/types"
import { renderFlow } from "@/lib/flow-renderer"

const client = new Anthropic()

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "")
    .trim()
}

function parseIcons(text: string, count: number): string[] {
  const icons: string[] = []
  const matches = text.matchAll(/===ICON:(\d+)===([\s\S]*?)(?====(?:ICON:\d+|END)|$)/g)
  for (const m of matches) icons[parseInt(m[1]) - 1] = m[2].trim()
  return icons.slice(0, count)
}

function formatConversation(messages: AIMessage[]): string {
  return messages
    .filter((m, i) => !(i === 0 && m.role === "user"))
    .filter(m => !m.content.includes("```json"))
    .map(m => `${m.role === "user" ? "ADMIN" : "CLAUDE"}: ${m.content}`)
    .join("\n\n")
}

const ICON_STYLE = `
STYLE REFERENCE — real icons from this app. Match exactly:

Example A (shield + check — security):
<path d="M12 2L4 6v5.5C4 16.3 7.6 20.7 12 22c4.4-1.3 8-5.7 8-10.5V6L12 2Z" stroke="#F2843C" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
<path d="M9 12l2 2 4-4" stroke="#F2843C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>

Example B (neural node — AI/processing):
<circle cx="12" cy="12" r="3" fill="#F2843C" fillOpacity="0.8"/>
<circle cx="4" cy="7" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" fill="none"/>
<circle cx="4" cy="17" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" fill="none"/>
<circle cx="20" cy="12" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" fill="none"/>
<line x1="5.5" y1="7.5" x2="9.5" y2="11" stroke="#F2843C" strokeWidth="0.9" opacity="0.4"/>
<line x1="5.5" y1="16.5" x2="9.5" y2="13" stroke="#F2843C" strokeWidth="0.9" opacity="0.4"/>
<line x1="14.5" y1="12" x2="18.2" y2="12" stroke="#F2843C" strokeWidth="0.9" opacity="0.4"/>

Example C (lightning — speed/action):
<path d="M13 2L4 13h7l-2 9 11-13h-7L13 2Z" stroke="#F2843C" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>

Mandatory style: strokeWidth 1.2–1.4 primary, 0.9–1.0 secondary. strokeLinecap="round" strokeLinejoin="round" everywhere. fill="none" on stroked shapes. fillOpacity ≤ 0.15 for area hints (or 0.8 only on tiny dots r ≤ 3). All coordinates within 2–22 (viewBox is 24×24).`

function buildIconPrompt(
  headline: string,
  tags: string[],
  features: { title: string; description: string }[],
  conversationContext: string,
): string {
  const featureLines = features
    .map((f, i) => `${i + 1}. TITLE: "${f.title}"\n   DESCRIPTION: ${f.description}`)
    .join("\n\n")

  return `You create SVG icons for a product showcase page. Background: #08090B. Color: #F2843C only.

PRODUCT: ${headline} (${tags.join(", ")})

FULL CONVERSATION (ground truth about this product):
${conversationContext || "(not available)"}

${ICON_STYLE}

Generate ${features.length} icons. Each must visually represent the specific feature's real-world action — not a generic software icon.

Process: read title + description → identify the concrete action or object → draw it in the style above.

RULES:
- Inner elements only, no <svg> wrapper (page provides viewBox="0 0 24 24")
- Elements: <path> <circle> <rect> <line> <polyline> <polygon>
- No animations, no <style>, no <defs>, no <g>
- 4–8 elements per icon

FEATURES:
${featureLines}

Return in EXACTLY this format (no markdown):

===ICON:1===
[inner elements for feature 1]
===ICON:2===
[inner elements for feature 2]
[continue for all ${features.length} features]
===END===`
}

function buildMapPrompt(headline: string, conversationContext: string): string {
  return `Extract geographic coverage data from this product conversation. Return ONLY valid JSON, no markdown.

PRODUCT: ${headline}

CONVERSATION:
${conversationContext || "(not available)"}

Instructions:
- Identify which countries this product currently operates in (not planned future expansion)
- Choose a map center and scale that frames the coverage area well

Scale guide:
- Single country (small): scale 2500–4000
- Single country (large, e.g. US): scale 800–1200
- Regional cluster (e.g. Central Europe): scale 600–900
- Continent: scale 300–500
- World: scale 150

Return this JSON shape:
{
  "label": "Coverage Area",
  "countries": ["PL", "DE"],
  "cities": [],
  "center": [19.5, 50.8],
  "scale": 1200
}

Rules:
- countries: ISO alpha-2 codes only
- cities: always an empty array []
- center: [longitude, latitude] of the map viewport center
- scale: higher = more zoomed in
- If product has no geographic scope, return { "countries": [], "cities": [], "center": [0, 20], "scale": 150 }`
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const {
    sessionId,
    headline = "", tags = [],
    features = [], steps = [],
  } = await req.json()

  let conversationContext = ""
  if (sessionId) {
    const aiSession = await queryOne<AISession>(
      `SELECT * FROM ai_sessions WHERE id = $1`,
      [sessionId]
    )
    if (aiSession?.messages) {
      conversationContext = formatConversation(aiSession.messages as AIMessage[])
    }
  }

  // Run icon generation and map extraction in parallel
  const [iconMsg, mapMsg] = await Promise.all([
    features.length > 0
      ? client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 6000,
          messages: [{ role: "user", content: buildIconPrompt(headline, tags, features, conversationContext) }],
        })
      : Promise.resolve(null),
    client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: buildMapPrompt(headline, conversationContext) }],
    }),
  ])

  // Parse icons
  const iconSvgs = iconMsg
    ? parseIcons(iconMsg.content[0].type === "text" ? iconMsg.content[0].text : "", features.length).map(sanitizeSvg)
    : []

  // Generate flow SVG programmatically
  const flowSvg = steps.length > 0 ? renderFlow(steps) : undefined

  // Parse map data
  let mapData: MapContent | undefined
  try {
    const mapRaw = mapMsg.content[0].type === "text" ? mapMsg.content[0].text : ""
    const jsonStr = mapRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    const parsed = JSON.parse(jsonStr) as MapContent
    if (parsed.countries?.length > 0 || parsed.cities?.length > 0) mapData = parsed
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ iconSvgs, flowSvg, mapData })
}
