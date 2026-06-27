import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "")
    .trim()
}

// Parse the delimiter-based response format (avoids JSON escaping of SVG)
function parseResponse(text: string): { iconSvgs: string[]; heroVizSvg: string } {
  const icons: string[] = []
  const iconMatches = text.matchAll(/===ICON:(\d+)===([\s\S]*?)(?====(?:ICON:\d+|HEROVIZ)|$)/g)
  for (const m of iconMatches) icons[parseInt(m[1]) - 1] = m[2].trim()

  const vizMatch = text.match(/===HEROVIZ===([\s\S]*?)(?====END===|$)/)
  const heroVizSvg = vizMatch ? vizMatch[1].trim() : ""

  return { iconSvgs: icons, heroVizSvg }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const {
    headline = "", tags = [], description = "",
    features = [], steps = [], stats = [],
  } = await req.json()

  const featureLines = features
    .map((f: { title: string; description: string }, i: number) =>
      `${i + 1}. "${f.title}" — ${f.description}`)
    .join("\n")

  const statsText = stats.map((s: { label: string; value: string }) =>
    `${s.label}: ${s.value}`).join("  |  ")

  const stepsText = steps.map((s: { title: string }, i: number) =>
    `${i + 1}. ${s.title}`).join("  →  ")

  const prompt = `You generate SVG visual assets for a futuristic software product landing page aimed at investors and enterprise clients. The page background is near-black #08090B. The only permitted color is #F2843C (amber/orange) at varying opacities. No other colors. No gradients. No fills other than #F2843C or none.

PRODUCT
Headline: ${headline}
Tags: ${tags.join(", ") || "software"}
Description: ${description}
${stepsText  ? `Process: ${stepsText}` : ""}
${statsText  ? `Stats:   ${statsText}` : ""}

FEATURES
${featureLines}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK A — FEATURE ICONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate ${features.length} icons. Each icon MUST visually and specifically represent its feature's concept — not software in general.

Good icon design:
- Look at the feature's domain: scheduling → a grid/calendar grid; pickup → an arrow going up from a box; settlement → coins or a flow arrow; security → a padlock or shield with check; automation → a gear with recursive arrow
- Use the actual metaphor of the feature's real-world action
- Minimal and readable at 28×28px

STRICT RULES
- Return ONLY inner elements (no <svg> wrapper — that is provided by the page)
- Elements: <path> <circle> <rect> <line> <polyline> <polygon> only
- Attributes: d, cx, cy, r, x, y, x1, y1, x2, y2, width, height, rx, ry, points, fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin, strokeDasharray, opacity, fillOpacity — nothing else
- stroke="#F2843C" or fill="#F2843C" — no other color values
- No animations, no <style>, no <defs>
- 4–8 elements per icon

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK B — HERO VISUALIZATION (480×380)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate a SINGLE animated SVG that a senior motion designer would be proud of.

QUALITY CRITERIA — your visualization must pass ALL of these:
✓ Immediately communicates what this specific product DOES (not "tech in general")
✓ Uses actual data from the product: real stat values as numbers in labels, real feature names as node/bar labels, real process steps as stages
✓ Has a clear visual narrative: something starts, something moves/updates, something completes
✓ Professional timing: entry animations 0.5–1.5s, ambient loops 2–4s — nothing frantic, nothing sluggish
✓ Labels are legible: fontSize 8–11, fontFamily="monospace", key values at higher opacity (0.7–0.9)
✓ Spatial hierarchy: one dominant focal element, supporting elements around it

VISUALIZATION TYPE — choose based on product domain:
- Logistics/delivery/pickup → pipeline or route: steps as labeled boxes, items flowing between them, counters updating
- Financial/payments/settlement → flow: money amounts moving from source to destination, balance bars, transaction list
- Analytics/monitoring/data → dashboard: live chart bars growing, metric values, sparklines
- AI/ML/automation → inference graph: input features → processing layers → output scores
- Platform/API/integration → connection map: services connecting, data packets flowing
- SaaS/B2B workflow → process board: columns with cards moving between stages

For THIS product ("${headline}", tags: ${tags.join(", ")}): think carefully which type fits best. Then build it.

SMIL ANIMATION PATTERNS (use these — NOT CSS @keyframes which leak from inline SVG):

Fade in element:
  <animate attributeName="opacity" from="0" to="0.75" dur="0.8s" fill="freeze" begin="0.4s"/>

Grow a bar upward (rect at y=baseline, height=0 initially):
  <animate attributeName="height" from="0" to="90" dur="1.1s" fill="freeze" begin="0.6s" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
  <animate attributeName="y" from="280" to="190" dur="1.1s" fill="freeze" begin="0.6s" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>

Pulse opacity loop:
  <animate attributeName="opacity" values="0.9;0.25;0.9" dur="2.2s" repeatCount="indefinite"/>

Move a circle along a horizontal line:
  <animateMotion dur="2s" repeatCount="indefinite" calcMode="linear">
    <mpath href="#flow-path"/>
  </animateMotion>

Draw a line (using stroke-dashoffset):
  <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1s" fill="freeze" begin="0.5s"/>

For stroke-dashoffset animation, set strokeDasharray equal to the path length on the element.

REQUIRED ELEMENTS
- A pulsing dot + "LIVE" text within the bottom 40px (y > 340)
- At least 4 distinct animated elements (not all the same animation type)
- At least 3 visible text labels that use real product data
- A status line: stroke="#F2843C" at y=340, strokeWidth="0.4", opacity="0.15"

STRICT RULES
- Return complete <svg viewBox="0 0 480 380"> element
- SMIL animations only: <animate>, <animateTransform>, <animateMotion>
- All begin= values must be "Xs" format (e.g. "0s", "0.5s", "2s") — no event triggers
- No <script>, no event handlers, no CSS @keyframes, no <style> blocks, no <image>, no <use> referencing external URLs
- The SVG must be self-contained and work when placed inline in an HTML page

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return your response in EXACTLY this delimiter format (no JSON, no markdown):

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
      max_tokens: 10000,
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
