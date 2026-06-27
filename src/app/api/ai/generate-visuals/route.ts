import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { queryOne } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"
import type { AISession, AIMessage } from "@/types"

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
  const heroVizSvg = vizMatch ? vizMatch[1].trim() : ""

  return { iconSvgs: icons, heroVizSvg }
}

function formatConversation(messages: AIMessage[]): string {
  return messages
    .filter((m, i) => !(i === 0 && m.role === "user"))
    .filter(m => !m.content.includes("```json"))
    .map(m => `${m.role === "user" ? "ADMIN" : "CLAUDE"}: ${m.content}`)
    .join("\n\n")
}

// Style reference icons — Claude must match this exact visual language
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

Style rules extracted from these examples:
- strokeWidth: 1.2–1.4 for primary shapes, 0.9–1.0 for secondary lines
- strokeLinecap="round" strokeLinejoin="round" on all paths
- fill="none" on stroked shapes (no solid fills)
- fillOpacity ≤ 0.15 for subtle area hints (or fillOpacity 0.8 only on tiny focal dots ≤ r3)
- opacity 0.4–0.6 on supporting elements, 1.0 on primary
- All coordinates within 2–22 range (24×24 viewBox, 1px margin)
`

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const {
    sessionId,
    headline = "", tags = [], description = "",
    features = [], steps = [], stats = [],
  } = await req.json()

  // Fetch the full clarification conversation for deep product context
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

  const featureLines = features
    .map((f: { title: string; description: string }, i: number) =>
      `${i + 1}. TITLE: "${f.title}"\n   DESCRIPTION: ${f.description}`)
    .join("\n\n")

  const statsText = stats.map((s: { label: string; value: string }) =>
    `${s.label}: ${s.value}`).join("  |  ")

  const stepsText = steps.map((s: { title: string }, i: number) =>
    `${i + 1}. ${s.title}`).join("  →  ")

  const prompt = `You generate SVG visual assets for a product showcase page aimed at investors and enterprise clients. Every visual must look investor-grade: clean, minimal, precise, and immediately readable.

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
2. Identify the real-world action or object at the core of this feature (what does the user actually do? what physically happens?)
3. Draw that action or object using the minimal set of SVG primitives that communicates it instantly at 28×28px
4. Match the style of the reference examples above exactly — same stroke weights, same opacity levels, same linecap/linejoin

Bad icon thinking: "this feature is about documents → draw a generic document rectangle"
Good icon thinking: "this feature processes bailiff court orders → draw a stamped document with a seal, or a legal scale"

Bad icon thinking: "this feature is about scheduling → draw a generic calendar grid"
Good icon thinking: "this feature schedules pickup slots in a 2-hour window → draw a narrow time window on a timeline with an arrow"

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
  • 3–5 primary elements (the things being shown — nodes, bars, stages)
  • 2–4 connector elements (lines, arrows between primary elements)
  • 3–6 short text labels (max 12 chars each, attached to primary elements)
  • 1–2 supporting stat values (optional, bottom area)
  Total: 10–15 SVG elements maximum. If you need more, your concept is too complex — simplify.

SAFE ZONES
  • No element, shape, or text may exceed these boundaries:
    x: 16 to 464 (leave 16px margin each side)
    y: 16 to 364 (leave 16px margin top and bottom)
  • Text x position: account for text width. A 12-char monospace label at fontSize=9 is ~72px wide.
    Place text anchors so the full string stays inside x=16–464.
  • Plan every element's position before writing SVG. If two elements are within 20px of each other, one of them moves.

NO OVERLAPPING — ABSOLUTE RULE
  Before finalising your SVG, check every element against every other element. No text may sit on top of a shape. No shape may obscure a label. No two labels within 14px vertically. If anything would overlap, remove or reposition it. A viz with 4 clean elements is better than 10 cluttered ones.

NO PICTOGRAMS
  Do not draw recognisable real-world objects (no houses, phones, boxes, trucks, people). Use abstract geometric elements: stroke-only circles as nodes, stroke-only rects as stage boxes, lines as connections, small filled dots (r≤4) as data points or indicators. Label them with text instead of trying to draw what they represent.

WHAT TO SHOW
  Read the product context and conversation above. Choose ONE core action of this product — the thing that happens repeatedly, the thing that creates value — and show it happening. Not everything the product does. Just the one thing that, if an investor saw it, they'd immediately understand why this product exists.

  The visualization should feel like a live window into this product in operation. Use real labels from the product data: actual step names, actual stat values, actual entity names mentioned in the conversation.

ANIMATION PRINCIPLE
  Every animated element must represent a real action in this product. A dot moving across a line must represent something actually moving (a request, a payment, an item). A value fading in must represent data arriving. Purely decorative animation is removed. Fewer, meaningful animations > many meaningless ones.

  Entry animations: 0.4–1.2s duration, fill="freeze"
  Ambient loops: 2–4s duration, repeatCount="indefinite"
  Stagger entry delays: 0s, 0.3s, 0.6s, 0.9s… (not all at once)

SMIL ANIMATION PATTERNS (SMIL only — CSS @keyframes leak into the page):

Fade in:
  <animate attributeName="opacity" from="0" to="0.7" dur="0.7s" fill="freeze" begin="0.3s"/>

Grow bar upward (set initial height="0" y=baseline on the rect):
  <animate attributeName="height" from="0" to="80" dur="1s" fill="freeze" begin="0.5s" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
  <animate attributeName="y" from="240" to="160" dur="1s" fill="freeze" begin="0.5s" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>

Pulse loop:
  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.4s" repeatCount="indefinite"/>

Move element along a defined path:
  <path id="flow" d="M 60 190 L 420 190" stroke="none" fill="none"/>
  <circle r="3" fill="#F2843C">
    <animateMotion dur="2.2s" repeatCount="indefinite" calcMode="linear">
      <mpath href="#flow"/>
    </animateMotion>
  </circle>

Draw a line progressively:
  <line x1="60" y1="190" x2="420" y2="190" stroke="#F2843C" strokeWidth="0.8" strokeDasharray="360" strokeDashoffset="360" opacity="0.3">
    <animate attributeName="stroke-dashoffset" from="360" to="0" dur="1s" fill="freeze" begin="0.4s"/>
  </line>

STRICT TECHNICAL RULES FOR VIZ
- Return complete <svg viewBox="0 0 480 380"> element
- SMIL only: <animate>, <animateTransform>, <animateMotion>
- All begin= values: "Xs" format (e.g. "0s", "0.5s") — no event triggers
- <defs> and <g> are allowed
- No <script>, no event handlers, no CSS @keyframes, no <style>, no <image>, no external <use>
- Self-contained, works inline in HTML

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

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 12000,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = msg.content[0].type === "text" ? msg.content[0].text : ""
    const { iconSvgs, heroVizSvg } = parseResponse(raw)

    return NextResponse.json({
      iconSvgs:   iconSvgs.map(sanitizeSvg),
      heroVizSvg: sanitizeSvg(heroVizSvg),
    })
  } catch (e) {
    return NextResponse.json({ error: `Visual generation failed: ${(e as Error).message}` }, { status: 500 })
  }
}
