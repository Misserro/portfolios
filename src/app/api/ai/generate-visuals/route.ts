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

  const prompt = `You generate SVG visual assets for a product showcase page. This page is embedded in an app with a near-black #08090B background and a single accent color #F2843C (amber/orange). Your visuals must feel native to this design — not generic tech graphics dropped in from somewhere else.

COLOR AND STYLE RULES (non-negotiable)
- Background context: #08090B (near-black). Your SVGs are placed on this background.
- Only color permitted: #F2843C at varying opacities
- No other colors, no gradients, no white, no grey, no blue
- Font: fontFamily="monospace" for all text labels
- Clean, minimal, architectural — not decorative, not playful

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

STRICT TECHNICAL RULES
- Return ONLY inner SVG elements (no <svg> wrapper — the page provides viewBox="0 0 24 24")
- Permitted elements: <path> <circle> <rect> <line> <polyline> <polygon>
- Permitted attributes: d, cx, cy, r, x, y, x1, y1, x2, y2, width, height, rx, ry, points, fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin, strokeDasharray, opacity, fillOpacity
- stroke="#F2843C" or fill="#F2843C" — no other color values
- No animations, no <style>, no <defs>, no <g>
- 4–8 elements per icon

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK B — HERO VISUALIZATION (480×380)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design a single animated SVG that communicates exactly what this specific product does — as if you opened the product and watched it work for 5 seconds.

WHAT THIS MEANS IN PRACTICE
You have read the full conversation above. You now know the real domain, the real workflow, and the real data. Use all of it. The visualization should feel like a live window into this specific product, not an illustration of "software" or a generic dashboard.

Ask yourself: if someone who had never heard of this product watched this animation for 5 seconds, would they understand the core value? Would they see REAL things from this product — its actual steps, its actual entities, its actual numbers — moving and doing something?

ANIMATION PRINCIPLE
Every animated element must represent a real action in this product. A dot moving across a line must represent something real moving (a document, a payment, a request). A value changing must be a real metric updating. An element appearing must represent something being created or completed. If an animation is purely decorative — it has no semantic meaning in the product — remove it.

VISUAL QUALITY BAR
- One dominant focal element that immediately communicates the product's core action
- Supporting elements that show the context and scale of the operation
- Text labels drawn from real product data (actual step names, actual stat values, actual entity names from the conversation)
- Entry animations 0.5–2s, ambient loops 2–5s — nothing frantic, nothing sluggish
- Labels legible: fontSize 8–11, fontFamily="monospace"

SMIL ANIMATION PATTERNS (use these — NOT CSS @keyframes, which leak from inline SVG into the page):

Fade in:
  <animate attributeName="opacity" from="0" to="0.75" dur="0.8s" fill="freeze" begin="0.4s"/>

Grow bar upward:
  <animate attributeName="height" from="0" to="90" dur="1.1s" fill="freeze" begin="0.6s" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
  <animate attributeName="y" from="280" to="190" dur="1.1s" fill="freeze" begin="0.6s" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>

Pulse loop:
  <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.4s" repeatCount="indefinite"/>

Move element along a path:
  <animateMotion dur="2s" repeatCount="indefinite" calcMode="linear">
    <mpath href="#my-path"/>
  </animateMotion>

Draw a line:
  <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1s" fill="freeze" begin="0.5s"/>
  (set strokeDasharray on the element equal to its approximate length)

Transform rotation:
  <animateTransform attributeName="transform" type="rotate" from="0 240 190" to="360 240 190" dur="8s" repeatCount="indefinite"/>

STRICT TECHNICAL RULES
- Return complete <svg viewBox="0 0 480 380"> element
- SMIL only: <animate>, <animateTransform>, <animateMotion> — never CSS @keyframes or <style>
- All begin= values: "Xs" format (e.g. "0s", "0.5s") — no event triggers
- No <script>, no event handlers, no <image>, no <use> referencing external URLs
- <defs> allowed (for path definitions used by <animateMotion><mpath>)
- <g> allowed for grouping
- Self-contained, works inline in an HTML page

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
