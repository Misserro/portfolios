import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"
import type { AISession, AIMessage, Segment, HeroContent, FeaturesContent, HowItWorksContent, StatsContent } from "@/types"

const client = new Anthropic()

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "")
    .trim()
}

function parseResponse(text: string): { iconSvgs: string[]; heroVizSvg: string } {
  const icons: string[] = []
  const iconMatches = text.matchAll(/===ICON:(\d+)===([\s\S]*?)(?====(?:ICON:\d+|HEROVIZ)|$)/g)
  for (const m of iconMatches) icons[parseInt(m[1]) - 1] = m[2].trim()
  const vizMatch = text.match(/===HEROVIZ===([\s\S]*?)(?====END===|$)/)
  return { iconSvgs: icons, heroVizSvg: vizMatch ? vizMatch[1].trim() : "" }
}

function formatConversation(messages: AIMessage[]): string {
  return messages
    .filter((m, i) => !(i === 0 && m.role === "user"))
    .filter(m => !m.content.includes("```json"))
    .map(m => `${m.role === "user" ? "ADMIN" : "CLAUDE"}: ${m.content}`)
    .join("\n\n")
}

const STYLE_EXAMPLES = `
STYLE REFERENCE — these are real icons from the app. Match this exact visual style:

Example A (shield with check — security concept):
<path d="M12 2L4 6v5.5C4 16.3 7.6 20.7 12 22c4.4-1.3 8-5.7 8-10.5V6L12 2Z" stroke="#F2843C" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
<path d="M9 12l2 2 4-4" stroke="#F2843C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>

Example B (neural node — connected processing concept):
<circle cx="12" cy="12" r="3" fill="#F2843C" fillOpacity="0.8"/>
<circle cx="4" cy="7" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" fill="none"/>
<circle cx="4" cy="17" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" fill="none"/>
<circle cx="20" cy="12" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" fill="none"/>
<line x1="5.5" y1="7.5" x2="9.5" y2="11" stroke="#F2843C" strokeWidth="0.9" opacity="0.4"/>
<line x1="5.5" y1="16.5" x2="9.5" y2="13" stroke="#F2843C" strokeWidth="0.9" opacity="0.4"/>
<line x1="14.5" y1="12" x2="18.2" y2="12" stroke="#F2843C" strokeWidth="0.9" opacity="0.4"/>

Example C (lightning bolt — speed/action concept):
<path d="M13 2L4 13h7l-2 9 11-13h-7L13 2Z" stroke="#F2843C" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>

Style rules:
- strokeWidth: 1.2–1.4 for primary shapes, 0.9–1.0 for secondary lines
- strokeLinecap="round" strokeLinejoin="round" on all paths
- fill="none" on stroked shapes
- fillOpacity ≤ 0.15 for subtle hints (or 0.8 only on tiny dots r≤3)
- opacity 0.4–0.6 on supporting elements
- Coordinates within 2–22 (24×24 viewBox)
`

function buildPrompt(
  headline: string, tags: string[], description: string,
  features: { title: string; description: string }[],
  steps: { title: string }[],
  stats: { label: string; value: string }[],
  conversationContext: string,
): string {
  const featureLines = features
    .map((f, i) => `${i + 1}. TITLE: "${f.title}"\n   DESCRIPTION: ${f.description}`)
    .join("\n\n")
  const statsText = stats.map(s => `${s.label}: ${s.value}`).join("  |  ")
  const stepsText = steps.map((s, i) => `${i + 1}. ${s.title}`).join("  →  ")

  return `You generate SVG visual assets for a product showcase page aimed at investors and enterprise clients. Every visual must look investor-grade: clean, minimal, precise, and immediately readable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL STYLE RULES (apply to ALL tasks)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Background: #08090B (near-black). Your SVGs sit on this background.
- Only permitted color: #F2843C (amber) at varying opacities. No other color, no white, no grey, no gradients.
- All text: fontFamily="monospace"
- Aesthetic: architectural, minimal, precise. Not decorative. Not playful.
- FILLS: Only tiny focal dots (r ≤ 4) may use fillOpacity > 0.3. Any shape larger than that must be stroke-only (fill="none") or fillOpacity ≤ 0.08. No solid filled rectangles or large shapes ever.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Headline: ${headline}
Tags: ${tags.join(", ") || "software"}
Description: ${description}
${stepsText ? `Process steps: ${stepsText}` : ""}
${statsText ? `Stats: ${statsText}` : ""}

FULL CLARIFICATION CONVERSATION (the admin's own words about this product):
${conversationContext || "(no conversation available)"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK A — FEATURE ICONS (${features.length} total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${STYLE_EXAMPLES}

YOUR TASK: Generate ${features.length} icons. Each icon must visually represent the specific feature described — not the product category in general, not a generic tech icon.

To design each icon correctly:
1. Read BOTH the title and description carefully
2. Identify the real-world action or object at the core of this feature
3. Draw that action using the minimal SVG primitives that communicates it at 28×28px
4. Match the style examples above exactly

Bad: "document feature → draw a generic rectangle"
Good: "bailiff court order processing → stamp with seal, or legal scale"

FEATURES TO ICONIFY:
${featureLines}

STRICT TECHNICAL RULES FOR ICONS
- Return ONLY inner SVG elements (no <svg> wrapper — the page provides viewBox="0 0 24 24")
- Permitted elements: <path> <circle> <rect> <line> <polyline> <polygon>
- Permitted attributes: d, cx, cy, r, x, y, x1, y1, x2, y2, width, height, rx, ry, points, fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin, strokeDasharray, opacity, fillOpacity
- stroke="#F2843C" or fill="#F2843C" — no other color values
- No animations, no <style>, no <defs>, no <g>
- 4–8 elements per icon

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK B — HERO VISUALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CANVAS: exactly 480 wide × 380 tall pixels. viewBox="0 0 480 380".

SPATIAL BUDGET — you have room for:
  • 1 title label (optional, max 24 chars, top area)
  • 3–5 primary elements (nodes, bars, stages)
  • 2–4 connector elements (lines, arrows)
  • 3–6 short text labels (max 12 chars each)
  • 1–2 supporting stat values (optional, bottom area)
  Total: 10–15 SVG elements maximum. If you need more, simplify.

SAFE ZONES
  • No element may exceed: x=16–464, y=16–364
  • Text x position: account for text width. A 12-char label at fontSize=9 is ~72px wide.
    Place anchors so the full string stays inside x=16–464.
  • Plan every element's position before writing SVG. If two elements are within 20px of each other, one moves.

NO OVERLAPPING — ABSOLUTE RULE
  Check every element against every other. No text on top of shapes. No two labels within 14px vertically.
  A viz with 4 clean elements beats 10 cluttered ones.

NO PICTOGRAMS
  No houses, phones, boxes, trucks, people. Use abstract geometric elements: stroke-only circles as nodes,
  stroke-only rects as stage boxes, lines as connections, small filled dots (r≤4) as data points.
  Label with text instead of drawing what they represent.

WHAT TO SHOW
  Choose ONE core action of this product and show it happening. The thing that happens repeatedly,
  the thing that creates value. Use real labels from the product: actual step names, actual stat values,
  actual entity names from the conversation above.

ANIMATION PRINCIPLE
  Every animated element must represent a real action. A dot moving = something actually moving.
  Purely decorative animation is removed. Entry: 0.4–1.2s, fill="freeze". Loops: 2–4s, repeatCount="indefinite".

SMIL ANIMATION PATTERNS (SMIL only — CSS @keyframes leak into the page):

Fade in:
  <animate attributeName="opacity" from="0" to="0.7" dur="0.7s" fill="freeze" begin="0.3s"/>

Grow bar upward (set initial height="0" y=baseline on the rect):
  <animate attributeName="height" from="0" to="80" dur="1s" fill="freeze" begin="0.5s" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
  <animate attributeName="y" from="240" to="160" dur="1s" fill="freeze" begin="0.5s" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>

Pulse loop:
  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.4s" repeatCount="indefinite"/>

Move along path:
  <path id="flow" d="M 60 190 L 420 190" stroke="none" fill="none"/>
  <circle r="3" fill="#F2843C"><animateMotion dur="2.2s" repeatCount="indefinite"><mpath href="#flow"/></animateMotion></circle>

Draw line progressively:
  <line x1="60" y1="190" x2="420" y2="190" stroke="#F2843C" strokeWidth="0.8" strokeDasharray="360" strokeDashoffset="360" opacity="0.3">
    <animate attributeName="stroke-dashoffset" from="360" to="0" dur="1s" fill="freeze" begin="0.4s"/>
  </line>

STRICT TECHNICAL RULES
- Return complete <svg viewBox="0 0 480 380"> element
- SMIL only: <animate>, <animateTransform>, <animateMotion>
- All begin= values: "Xs" format — no event triggers
- <defs> and <g> allowed
- No <script>, no event handlers, no CSS, no <style>, no <image>, no external <use>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return in EXACTLY this format (no JSON, no markdown):

===ICON:1===
[inner SVG elements for feature 1]
===ICON:2===
[inner SVG elements for feature 2]
[continue for all ${features.length} features]
===HEROVIZ===
[complete <svg viewBox="0 0 480 380"> element]
===END===`
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { productId } = await req.json()
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

  // Load all segments for this product
  const segments = await query<Segment>(
    `SELECT * FROM segments WHERE product_id = $1 ORDER BY "order" ASC`,
    [productId]
  )

  const heroSeg  = segments.find(s => s.type === "hero")
  const featSeg  = segments.find(s => s.type === "features")
  const stepSeg  = segments.find(s => s.type === "how_it_works")
  const statSeg  = segments.find(s => s.type === "stats")

  if (!heroSeg) return NextResponse.json({ error: "No hero segment found" }, { status: 404 })

  const hero     = heroSeg.content as HeroContent
  const features = (featSeg?.content as FeaturesContent | undefined)?.features ?? []
  const steps    = (stepSeg?.content as HowItWorksContent | undefined)?.steps ?? []
  const stats    = (statSeg?.content as StatsContent | undefined)?.stats ?? []

  // Load the most recent AI session for this product
  const aiSession = await queryOne<AISession>(
    `SELECT * FROM ai_sessions WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [productId]
  )
  const conversationContext = aiSession?.messages
    ? formatConversation(aiSession.messages as AIMessage[])
    : ""

  const prompt = buildPrompt(
    hero.headline ?? "", hero.tags ?? [], hero.description ?? "",
    features, steps, stats, conversationContext,
  )

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 12000,
    messages: [{ role: "user", content: prompt }],
  })

  const raw = msg.content[0].type === "text" ? msg.content[0].text : ""
  const { iconSvgs, heroVizSvg } = parseResponse(raw)

  // Update hero segment with new viz_svg
  if (heroSeg && heroVizSvg) {
    const updatedHero: HeroContent = { ...hero, viz_svg: sanitizeSvg(heroVizSvg) }
    await query(
      `UPDATE segments SET content = $2, updated_at = now() WHERE id = $1`,
      [heroSeg.id, JSON.stringify(updatedHero)]
    )
  }

  // Update features segment with new icon_svgs
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
