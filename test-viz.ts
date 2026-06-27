// Run with: ANTHROPIC_API_KEY=... node --experimental-strip-types test-viz.ts
import Anthropic from "@anthropic-ai/sdk"
import { writeFileSync } from "fs"
import { renderViz, type VizData } from "./src/lib/viz-renderer.js"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PRODUCT_CONTEXT = `
Headline: Odzyskaj kaucję bez wychodzenia z domu
Tags: FinTech, Logistics, B2C, Poland
Description: Kaucjago is a deposit recovery app for Poland that lets consumers recover bottle deposits without leaving home. A courier comes to pick up your packed returnable bottles and you get the deposit credited to your account.

Process steps: 1. Pack bags → 2. Order courier → 3. Courier pickup → 4. Scan & Sort → 5. Credit to account

Stats: 20K+ bottles processed | 180+ pickups | 22%+ Silesia coverage | 40+ cities

Features:
1. Home Pickup — A courier collects your packed returnable bottles from your home or office address within a 2-hour time window you select
2. Real-time Tracking — Track your courier in real time as they head to your location
3. Instant Credit — Deposit value is credited to your account within minutes of pickup
4. Scheduled Pickups — Book recurring pickups for ongoing bottle collection
5. Multi-bag Support — Handle multiple bags per pickup, automatically counted and verified

FULL CONVERSATION:
CLAUDE: Tell me about what Kaucjago does
ADMIN: It's a service in Poland where you can get your bottle deposits back without going to the store. You just pack your returnable bottles (like beer, water bottles), book a courier through our app, and they come pick them up from your home. We scan everything and credit the deposit to your account.
CLAUDE: What's the main problem it solves?
ADMIN: In Poland you can return bottles at supermarkets for a small deposit (around 0.50 PLN per bottle). But most people don't bother because it's inconvenient - you have to bring them to the store, find a machine, wait in line. We make it effortless.
CLAUDE: What areas do you currently cover?
ADMIN: We're focused on Silesia region right now - that's Katowice, Gliwice, Tychy, Bytom and about 40 cities total. We cover about 22% of the Silesia population. Planning to expand to other regions.
CLAUDE: Tell me about your stats
ADMIN: We've processed over 20,000 bottles since launch, done 180+ pickups. We launched 2 weeks ago and it's growing fast.
`

const VIZ_EXTRACTION_PROMPT = `You are choosing a visualization for an investor-facing product showcase page.

${PRODUCT_CONTEXT}

Select the visualization type that best shows what makes this product valuable.

PIPELINE — sequential process with clear stages (workflows, order fulfillment): 3-4 stages max
DASHBOARD — metric comparison where numbers tell the story (analytics, growth): 3-4 bars
RADIAL — hub connecting multiple parties or services: 4-5 nodes

Return ONLY valid JSON, no markdown, no explanation:
{
  "type": "pipeline" | "dashboard" | "radial",
  "title": "max 20 chars — what is shown",
  "stages": [{"label": "MAX 9 CHARS", "sublabel": "MAX 11 CHARS optional"}],
  "bars": [{"label": "MAX 8 CHARS", "value": "MAX 8 CHARS display", "numericValue": 42}],
  "hub": "MAX 9 CHARS",
  "nodes": [{"label": "MAX 9 CHARS", "sublabel": "MAX 11 CHARS optional"}],
  "stats": [{"label": "MAX 9 CHARS", "value": "MAX 9 CHARS"}]
}

Include only fields for the chosen type plus stats (max 3, optional).
Use real data from the product — actual step names, actual metrics, actual entity names.
Keep all text within the char limits shown — longer text will be cut off.`

async function test() {
  console.log("Calling Anthropic API to extract viz data...")

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{ role: "user", content: VIZ_EXTRACTION_PROMPT }],
  })

  const raw = msg.content[0].type === "text" ? msg.content[0].text : ""
  console.log("\nRaw API response:\n", raw)

  // Parse JSON — strip any accidental markdown fences
  const jsonStr = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
  let vizData: VizData
  try {
    vizData = JSON.parse(jsonStr)
  } catch (err) {
    console.error("JSON parse failed:", err)
    process.exit(1)
  }

  console.log("\nParsed VizData:", JSON.stringify(vizData, null, 2))

  // Render SVG
  const svg = renderViz(vizData)
  const outPath = "/tmp/test-viz.svg"
  writeFileSync(outPath, svg)
  console.log(`\nSVG written to ${outPath}`)
  console.log(`SVG length: ${svg.length} chars`)

  // Basic checks
  const checks = [
    { label: "Has <svg viewBox",          pass: svg.includes('viewBox="0 0 480 380"') },
    { label: "No CSS @keyframes",         pass: !svg.includes("@keyframes") },
    { label: "No <script>",               pass: !svg.includes("<script") },
    { label: "No solid large fills",      pass: !svg.includes('fill-opacity="1"') || svg.match(/r="[1-4]"/g) !== null },
    { label: "Closes </svg>",             pass: svg.trimEnd().endsWith("</svg>") },
    { label: "Has animate elements",      pass: svg.includes("<animate ") },
    { label: "SMIL only (no @keyframes)", pass: !svg.includes("@keyframes") },
    { label: "Text stays in safe zone",   pass: checkTextBounds(svg) },
  ]

  console.log("\nChecks:")
  checks.forEach(c => console.log(`  ${c.pass ? "✓" : "✗"} ${c.label}`))

  const failed = checks.filter(c => !c.pass)
  if (failed.length > 0) {
    console.log(`\n${failed.length} checks failed`)
  } else {
    console.log("\nAll checks passed!")
  }
}

function checkTextBounds(svg: string): boolean {
  // Extract all text x= and y= attributes and check they're in range
  const xMatches = [...svg.matchAll(/<text[^>]+x="([^"]+)"/g)]
  const yMatches = [...svg.matchAll(/<text[^>]+y="([^"]+)"/g)]
  for (const m of xMatches) {
    const x = parseFloat(m[1])
    if (x < 16 || x > 464) { console.log(`  Text x=${x} out of bounds`); return false }
  }
  for (const m of yMatches) {
    const y = parseFloat(m[1])
    if (y < 16 || y > 364) { console.log(`  Text y=${y} out of bounds`); return false }
  }
  return true
}

test().catch(console.error)
