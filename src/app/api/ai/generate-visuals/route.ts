import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { queryOne } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"
import type { AISession, AIMessage } from "@/types"
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

Style rules: strokeWidth 1.2–1.4 primary, 0.9–1.0 secondary. strokeLinecap="round" strokeLinejoin="round". fill="none" on stroked shapes. fillOpacity ≤ 0.15 for area hints, or 0.8 only on tiny dots r≤3. Coordinates within 2–22.
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

FULL CONVERSATION (product domain context):
${conversationContext || "(not available)"}

${STYLE_EXAMPLES}

Generate ${features.length} icons. Each must represent the specific feature below — not software generically.

Icon design process:
1. Read both title AND description
2. Identify the real-world action at the core of this feature
3. Draw that action with minimal SVG primitives, readable at 28×28px
4. Match the style examples exactly

FEATURES:
${featureLines}

RULES:
- Return ONLY inner elements (no <svg> wrapper — page provides viewBox="0 0 24 24")
- Elements: <path> <circle> <rect> <line> <polyline> <polygon>
- Attributes: d, cx, cy, r, x, y, x1, y1, x2, y2, width, height, rx, ry, points, fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin, strokeDasharray, opacity, fillOpacity
- stroke="#F2843C" or fill="#F2843C" only — no other colors
- No animations, no <style>, no <defs>, no <g>
- 4–8 elements per icon

Format (no JSON, no markdown):
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

  return `You are choosing a visualization for an investor-facing product showcase page.

PRODUCT
Headline: ${headline}
Tags: ${tags.join(", ")}
Description: ${description}
${stepsText ? `Process: ${stepsText}` : ""}
${statsText ? `Stats: ${statsText}` : ""}

FULL CONVERSATION (admin's own words — use this for real entity names and domain details):
${conversationContext || "(not available)"}

Choose the visualization type that best shows what makes this product valuable to an investor in 5 seconds.

PIPELINE — sequential process with clear stages (order fulfillment, document processing, workflows): 3–4 stages
DASHBOARD — metric comparison where numbers tell the story (analytics, growth, performance): 3–4 bars
RADIAL — hub connecting multiple parties or services (platforms, integrations, networks): 4–5 nodes

Return ONLY valid JSON, no markdown, no explanation:
{
  "type": "pipeline" | "dashboard" | "radial",
  "title": "what is shown — MAX 20 CHARS",
  "stages": [{"label": "MAX 9 CHARS", "sublabel": "MAX 11 CHARS optional"}],
  "bars": [{"label": "MAX 8 CHARS", "value": "MAX 8 CHARS display", "numericValue": 42}],
  "hub": "MAX 9 CHARS",
  "nodes": [{"label": "MAX 9 CHARS", "sublabel": "MAX 11 CHARS optional"}],
  "stats": [{"label": "MAX 9 CHARS", "value": "MAX 9 CHARS"}]
}

Include only the fields for your chosen type. stats is optional (max 3) — include if good data exists.
Use real labels from the product: actual step names, actual metric names, actual entity types.
All text will be hard-truncated if it exceeds the char limit — stay within them.`
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const {
    sessionId,
    headline = "", tags = [], description = "",
    features = [], steps = [], stats = [],
  } = await req.json()

  // Fetch the full clarification conversation
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

  // Run icon generation and viz data extraction in parallel
  const [iconMsg, vizMsg] = await Promise.all([
    client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      messages: [{ role: "user", content: buildIconPrompt(headline, tags, features, conversationContext) }],
    }),
    client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: buildVizDataPrompt(headline, tags, description, steps, stats, conversationContext) }],
    }),
  ])

  // Parse icons
  const iconRaw  = iconMsg.content[0].type === "text" ? iconMsg.content[0].text : ""
  const iconSvgs = parseIcons(iconRaw, features.length).map(sanitizeSvg)

  // Parse viz data and render SVG programmatically
  let heroVizSvg = ""
  try {
    const vizRaw  = vizMsg.content[0].type === "text" ? vizMsg.content[0].text : ""
    const jsonStr = vizRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    const vizData = JSON.parse(jsonStr) as VizData
    heroVizSvg = renderViz(vizData)
  } catch {
    // Non-fatal: page falls back to computed viz
  }

  return NextResponse.json({ iconSvgs, heroVizSvg })
}
