import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"
import type { AISession, AIMessage, Segment, HeroContent, FeaturesContent, HowItWorksContent, StatsContent, MapContent } from "@/types"
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
  const iconMatches = text.matchAll(/===ICON:(\d+)===([\s\S]*?)(?====(?:ICON:\d+|END)|$)/g)
  for (const m of iconMatches) icons[parseInt(m[1]) - 1] = m[2].trim()
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
STYLE REFERENCE — real icons from the app. Match this exact visual style:

Example A (shield with check):
<path d="M12 2L4 6v5.5C4 16.3 7.6 20.7 12 22c4.4-1.3 8-5.7 8-10.5V6L12 2Z" stroke="#F2843C" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
<path d="M9 12l2 2 4-4" stroke="#F2843C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>

Example B (neural node):
<circle cx="12" cy="12" r="3" fill="#F2843C" fillOpacity="0.8"/>
<circle cx="4" cy="7" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" fill="none"/>
<circle cx="4" cy="17" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" fill="none"/>
<circle cx="20" cy="12" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" fill="none"/>
<line x1="5.5" y1="7.5" x2="9.5" y2="11" stroke="#F2843C" strokeWidth="0.9" opacity="0.4"/>
<line x1="5.5" y1="16.5" x2="9.5" y2="13" stroke="#F2843C" strokeWidth="0.9" opacity="0.4"/>
<line x1="14.5" y1="12" x2="18.2" y2="12" stroke="#F2843C" strokeWidth="0.9" opacity="0.4"/>

Example C (lightning bolt):
<path d="M13 2L4 13h7l-2 9 11-13h-7L13 2Z" stroke="#F2843C" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>

Style rules: strokeWidth 1.2–1.4 primary, 0.9–1.0 secondary. strokeLinecap="round" strokeLinejoin="round". fill="none" on stroked shapes. fillOpacity ≤ 0.15, or 0.8 only on tiny dots r≤3. Coordinates within 2–22.
`

function buildIconPrompt(
  headline: string, tags: string[], features: { title: string; description: string }[],
  conversationContext: string,
): string {
  const featureLines = features
    .map((f, i) => `${i + 1}. TITLE: "${f.title}"\n   DESCRIPTION: ${f.description}`)
    .join("\n\n")

  return `You generate SVG icons for a product showcase page. Background: #08090B. Color: #F2843C only.

PRODUCT: ${headline} (${tags.join(", ")})

FULL CONVERSATION:
${conversationContext || "(not available)"}

${ICON_STYLE}

Generate ${features.length} icons. Each must represent the specific feature — not software generically.

Icon design: read title AND description → identify the real-world action → draw it.

FEATURES:
${featureLines}

RULES:
- ONLY inner elements (no <svg> wrapper — page provides viewBox="0 0 24 24")
- Elements: <path> <circle> <rect> <line> <polyline> <polygon>
- stroke="#F2843C" or fill="#F2843C" only
- No animations, no <style>, no <defs>, no <g> — 4–8 elements per icon

===ICON:1===
[elements for feature 1]
===ICON:2===
[elements for feature 2]
[continue for all ${features.length} features]
===END===`
}

function buildMapPrompt(headline: string, conversationContext: string): string {
  return `Extract geographic coverage data from this product conversation. Return ONLY valid JSON, no markdown.

PRODUCT: ${headline}

CONVERSATION:
${conversationContext || "(not available)"}

Instructions:
- Identify which countries or regions this product currently operates in (not planned future expansion)
- List major cities/locations mentioned (with accurate real-world coordinates)
- Choose a map center and scale that frames the coverage area well

Scale guide:
- Single country (small): scale 2500–4000
- Single country (large, e.g. US): scale 800–1200
- Regional cluster (e.g. Central Europe): scale 600–900
- Continent: scale 300–500
- World: scale 150

Return this JSON shape (include only what applies):
{
  "label": "Coverage Area",
  "countries": ["PL"],
  "cities": [
    { "name": "Katowice", "coordinates": [19.027, 50.257] },
    { "name": "Gliwice", "coordinates": [18.670, 50.292] }
  ],
  "center": [19.5, 50.8],
  "scale": 3000
}

Rules:
- countries: ISO alpha-2 codes only
- coordinates: [longitude, latitude] — must be accurate real-world values
- center: [longitude, latitude] of the map viewport center
- scale: higher = more zoomed in
- Only include cities explicitly mentioned in the conversation — do not invent locations
- If product has no clear geographic scope, return { "countries": [], "cities": [], "center": [0, 20], "scale": 150 }`
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { productId } = await req.json()
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

  const segments = await query<Segment>(
    `SELECT * FROM segments WHERE product_id = $1 ORDER BY "order" ASC`,
    [productId]
  )

  const heroSeg = segments.find(s => s.type === "hero")
  const featSeg = segments.find(s => s.type === "features")
  const stepSeg = segments.find(s => s.type === "how_it_works")
  const mapSeg  = segments.find(s => s.type === "map")

  if (!heroSeg) return NextResponse.json({ error: "No hero segment found" }, { status: 404 })

  const hero     = heroSeg.content as HeroContent
  const features = (featSeg?.content as FeaturesContent | undefined)?.features ?? []
  const steps    = (stepSeg?.content as HowItWorksContent | undefined)?.steps ?? []

  const aiSession = await queryOne<AISession>(
    `SELECT * FROM ai_sessions WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [productId]
  )
  const conversationContext = aiSession?.messages
    ? formatConversation(aiSession.messages as AIMessage[])
    : ""

  const tags = hero.tags ?? []

  try {
    // Run icon generation and map extraction in parallel
    const [iconMsg, mapMsg] = await Promise.all([
      features.length > 0
        ? client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 6000,
            messages: [{ role: "user", content: buildIconPrompt(hero.headline ?? "", tags, features, conversationContext) }],
          })
        : Promise.resolve(null),
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{ role: "user", content: buildMapPrompt(hero.headline ?? "", conversationContext) }],
      }),
    ])

    // Parse and save icons
    if (iconMsg && featSeg) {
      const iconRaw  = iconMsg.content[0].type === "text" ? iconMsg.content[0].text : ""
      const iconSvgs = parseIcons(iconRaw, features.length).map(sanitizeSvg)
      if (iconSvgs.length > 0) {
        const featContent = featSeg.content as FeaturesContent
        const updatedFeatures = featContent.features.map((f, i) => ({
          ...f,
          icon_svg: iconSvgs[i] ? sanitizeSvg(iconSvgs[i]) : f.icon_svg,
        }))
        await query(
          `UPDATE segments SET content = $2, updated_at = now() WHERE id = $1`,
          [featSeg.id, JSON.stringify({ features: updatedFeatures })]
        )
      }
    }

    // Generate and save flow SVG
    if (stepSeg && steps.length > 0) {
      const flowSvg = renderFlow(steps)
      const howContent = stepSeg.content as HowItWorksContent
      await query(
        `UPDATE segments SET content = $2, updated_at = now() WHERE id = $1`,
        [stepSeg.id, JSON.stringify({ ...howContent, flow_svg: flowSvg })]
      )
    }

    // Parse map data and upsert map segment
    let mapData: MapContent | null = null
    try {
      const mapRaw = mapMsg.content[0].type === "text" ? mapMsg.content[0].text : ""
      const jsonStr = mapRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
      mapData = JSON.parse(jsonStr) as MapContent
    } catch {
      // Non-fatal
    }

    if (mapData && (mapData.countries.length > 0 || mapData.cities.length > 0)) {
      if (mapSeg) {
        await query(
          `UPDATE segments SET content = $2, updated_at = now() WHERE id = $1`,
          [mapSeg.id, JSON.stringify(mapData)]
        )
      } else {
        const maxOrder = Math.max(...segments.map(s => s.order), 0)
        await query(
          `INSERT INTO segments (product_id, type, content, visible, "order")
           VALUES ($1, 'map', $2, true, $3)`,
          [productId, JSON.stringify(mapData), maxOrder + 1]
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("regenerate-visuals error:", e)
    return NextResponse.json({ error: (e as Error).message ?? "Generation failed" }, { status: 500 })
  }
}
