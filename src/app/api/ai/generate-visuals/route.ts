import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

// Strip anything that could execute in an inline SVG context
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "")
    .trim()
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

  const statsLine  = stats.map((s: { label: string; value: string }) => `${s.label}: ${s.value}`).join("  |  ")
  const stepsLine  = steps.map((s: { title: string }, i: number) => `${i + 1}. ${s.title}`).join("  →  ")

  const prompt = `You generate SVG assets for a futuristic software product landing page.
Background is near-black (#08090B). The ONLY permitted color is #F2843C (amber) at varying opacities. No other colors, no gradients, no patterns.

PRODUCT
Headline: ${headline}
Tags: ${tags.join(", ") || "software"}
Description: ${description}
${stepsLine  ? `Process: ${stepsLine}`  : ""}
${statsLine  ? `Stats:   ${statsLine}`  : ""}

FEATURES
${featureLines}

---

TASK A — FEATURE ICONS
Generate exactly ${features.length} SVG icons, one per feature.
Each icon must visually and specifically represent that feature's concept (not a generic software icon).

Strict rules:
- Return only inner elements — no <svg> wrapper
- Elements allowed: <path> <circle> <rect> <line> <polyline> <polygon>
- Attributes allowed: d, cx, cy, r, x, y, x1, y1, x2, y2, width, height, rx, ry, points,
  fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin, strokeDasharray, opacity, fillOpacity
- Color: stroke="#F2843C" or fill="#F2843C", always. No other color values.
- No animations in icons
- 4–7 elements per icon, viewBox will be 0 0 24 24

TASK B — HERO VISUALIZATION
Generate one animated SVG visualization (480×380) that fits this product's specific domain.
Choose the most fitting form: network topology, neural graph, data flow pipeline, signal waveform,
orbital system, particle field, timeline, architecture diagram — whatever fits best.
Make it feel like a live operational view of the product, not decoration.

Strict rules:
- Return a complete <svg viewBox="0 0 480 380"> element
- Use SMIL animations only: <animate>, <animateTransform>, <animateMotion>
  (NOT CSS @keyframes — CSS leaks from inline SVG into the page)
- All animations must have begin="0s" or begin="Xs" (numeric, not event-triggered)
- Color: only #F2843C at varying opacity
- Must include: a pulsing dot + "LIVE" text near the bottom (bottom 40px)
- Use fontFamily="monospace" for all text
- Any labels should reflect actual product content (feature names, step names, stat values)
- No <script>, no event handlers, no <image>, no <use> referencing external URLs

Return ONLY valid JSON — no markdown fences, no explanation:
{
  "iconSvgs": ["inner SVG for feature 1", "inner SVG for feature 2", ...],
  "heroVizSvg": "<svg viewBox=\\"0 0 480 380\\">...</svg>"
}`

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : ""
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

    const parsed = JSON.parse(jsonStr)
    return NextResponse.json({
      iconSvgs:   (parsed.iconSvgs  ?? []).map(sanitizeSvg),
      heroVizSvg: sanitizeSvg(parsed.heroVizSvg ?? ""),
    })
  } catch (e) {
    return NextResponse.json({ error: `Visual generation failed: ${(e as Error).message}` }, { status: 500 })
  }
}
