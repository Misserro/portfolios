import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"
import type { AISession, AIMessage, Segment, HeroContent, FeaturesContent, HowItWorksContent, StatsContent } from "@/types"
import { renderViz, type VizData } from "@/lib/viz-renderer"

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

const STYLE_EXAMPLES = `
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

${STYLE_EXAMPLES}

Generate ${features.length} icons. Each must represent the specific feature — not software generically.

Icon design: read title AND description → identify the real-world action → draw it at 28×28px → match style examples.

FEATURES:
${featureLines}

RULES:
- ONLY inner elements (no <svg> wrapper — page provides viewBox="0 0 24 24")
- Elements: <path> <circle> <rect> <line> <polyline> <polygon>
- stroke="#F2843C" or fill="#F2843C" only — no other colors
- No animations, no <style>, no <defs>, no <g> — 4–8 elements per icon

===ICON:1===
[elements for feature 1]
===ICON:2===
[elements for feature 2]
[continue for all ${features.length} features]
===END===`
}

function buildVizDataPrompt(
  headline: string, tags: string[], description: string,
  steps: { title: string }[], stats: { label: string; value: string }[],
  conversationContext: string,
): string {
  const stepsText = steps.map((s, i) => `${i + 1}. ${s.title}`).join(" → ")
  const statsText = stats.map(s => `${s.label}: ${s.value}`).join(" | ")

  return `Choose a visualization for an investor-facing product showcase page.

PRODUCT: ${headline} (${tags.join(", ")})
${description}
${stepsText ? `Process: ${stepsText}` : ""}
${statsText ? `Stats: ${statsText}` : ""}

CONVERSATION:
${conversationContext || "(not available)"}

PIPELINE — sequential stages (3–4): for workflows, order fulfillment, document processing
DASHBOARD — bar chart (3–4 bars): for metrics, growth, performance comparison
RADIAL — hub + satellites (4–5 nodes): for platforms, networks, integrations

Return ONLY valid JSON:
{
  "type": "pipeline" | "dashboard" | "radial",
  "title": "MAX 20 CHARS",
  "stages": [{"label": "MAX 9 CHARS", "sublabel": "MAX 11 CHARS optional"}],
  "bars": [{"label": "MAX 8 CHARS", "value": "MAX 8 CHARS", "numericValue": 42}],
  "hub": "MAX 9 CHARS",
  "nodes": [{"label": "MAX 9 CHARS", "sublabel": "MAX 11 CHARS optional"}],
  "stats": [{"label": "MAX 9 CHARS", "value": "MAX 9 CHARS"}]
}

Include only fields for chosen type. stats optional (max 3). Use real product labels — names from the conversation.`
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
  const statSeg = segments.find(s => s.type === "stats")

  if (!heroSeg) return NextResponse.json({ error: "No hero segment found" }, { status: 404 })

  const hero     = heroSeg.content as HeroContent
  const features = (featSeg?.content as FeaturesContent | undefined)?.features ?? []
  const steps    = (stepSeg?.content as HowItWorksContent | undefined)?.steps ?? []
  const stats    = (statSeg?.content as StatsContent | undefined)?.stats ?? []

  const aiSession = await queryOne<AISession>(
    `SELECT * FROM ai_sessions WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [productId]
  )
  const conversationContext = aiSession?.messages
    ? formatConversation(aiSession.messages as AIMessage[])
    : ""

  const tags = hero.tags ?? []

  // Run icon generation and viz data extraction in parallel
  const [iconMsg, vizMsg] = await Promise.all([
    client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      messages: [{ role: "user", content: buildIconPrompt(hero.headline ?? "", tags, features, conversationContext) }],
    }),
    client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: buildVizDataPrompt(hero.headline ?? "", tags, hero.description ?? "", steps, stats, conversationContext) }],
    }),
  ])

  // Parse icons
  const iconRaw  = iconMsg.content[0].type === "text" ? iconMsg.content[0].text : ""
  const iconSvgs = parseIcons(iconRaw, features.length).map(sanitizeSvg)

  // Render viz from structured data
  let heroVizSvg = ""
  try {
    const vizRaw  = vizMsg.content[0].type === "text" ? vizMsg.content[0].text : ""
    const jsonStr = vizRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    const vizData = JSON.parse(jsonStr) as VizData
    heroVizSvg = renderViz(vizData)
  } catch {
    // Non-fatal
  }

  // Save to DB
  if (heroSeg && heroVizSvg) {
    const updatedHero: HeroContent = { ...hero, viz_svg: heroVizSvg }
    await query(
      `UPDATE segments SET content = $2, updated_at = now() WHERE id = $1`,
      [heroSeg.id, JSON.stringify(updatedHero)]
    )
  }

  if (featSeg && iconSvgs.length > 0) {
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

  return NextResponse.json({ ok: true, iconCount: iconSvgs.length, hasViz: !!heroVizSvg })
}
