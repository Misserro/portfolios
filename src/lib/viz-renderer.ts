/**
 * Programmatic SVG renderer for hero visualizations.
 * Claude decides WHAT to show (labels, values, type).
 * This code decides HOW — all coordinates pre-calculated, text truncated, no overlaps.
 */

const AMBER = "#F2843C"
const FONT  = "monospace"
const W     = 480
const H     = 380

/** Escape SVG text content */
function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Truncate with ellipsis */
function tr(s: string | undefined | null, n: number): string {
  if (!s) return ""
  s = s.trim()
  return s.length > n ? s.slice(0, n - 1) + "…" : s
}

/** Format delay as "0.00s" */
function d(n: number): string {
  return `${n.toFixed(2)}s`
}

// ─── Shared stats row ─────────────────────────────────────────────────────────
// Sits below y=310, above y=380. Max 3 stats side by side.

export interface VizStat {
  label: string   // max 9 chars
  value: string   // max 9 chars — the big number/metric
}

function statsRow(stats: VizStat[], baseDelay: number): string {
  const n = stats.length
  if (n === 0) return ""
  const span = (W - 48) / n
  const x0   = 24 + span / 2
  let o = ""
  o += `<line x1="16" y1="310" x2="464" y2="310" stroke="${AMBER}" stroke-width="0.4" opacity="0.12"/>\n`
  stats.forEach((s, i) => {
    const sx = (x0 + i * span).toFixed(1)
    const dd  = d(baseDelay + i * 0.1)
    o += `<text x="${sx}" y="328" text-anchor="middle" font-size="11" font-weight="bold" fill="${AMBER}" font-family="${FONT}" opacity="0"><animate attributeName="opacity" from="0" to="0.85" dur="0.5s" fill="freeze" begin="${dd}"/>${e(tr(s.value, 9))}</text>\n`
    o += `<text x="${sx}" y="344" text-anchor="middle" font-size="7" fill="${AMBER}" font-family="${FONT}" opacity="0"><animate attributeName="opacity" from="0" to="0.38" dur="0.5s" fill="freeze" begin="${dd}"/>${e(tr(s.label, 10).toUpperCase())}</text>\n`
  })
  return o
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
// Horizontal stage boxes connected by arrows, animated particle flowing through.
// 2–4 stages max (4+ becomes too cramped).

export interface PipelineStage {
  label:    string   // max 9 chars — shown inside box
  sublabel?: string  // max 11 chars — shown below box
}

export interface PipelineData {
  title?:  string          // max 24 chars
  stages:  PipelineStage[]
  stats?:  VizStat[]
}

export function renderPipeline({ title, stages, stats = [] }: PipelineData): string {
  const S  = stages.slice(0, 4)
  const n  = Math.max(S.length, 2)
  const ST = stats.slice(0, 3)

  // Box geometry
  const BW = 86, BH = 38, BY = 156
  const FY = BY + BH / 2   // vertical centre of boxes = flow line y
  // Spread boxes evenly across the safe horizontal zone [24, 456]
  const ZONE_W = 432
  const step   = n > 1 ? (ZONE_W - BW) / (n - 1) : 0
  const centers = Array.from({ length: n }, (_, i) => 24 + BW / 2 + i * step)

  const flowX1 = centers[0] + BW / 2
  const flowX2 = centers[n - 1] - BW / 2

  let o = `<svg viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">\n`
  o += `<defs><path id="fp" d="M ${flowX1} ${FY} L ${flowX2} ${FY}"/></defs>\n`

  // Subtle horizontal axis
  o += `<line x1="0" y1="${FY}" x2="${W}" y2="${FY}" stroke="${AMBER}" stroke-width="0.25" opacity="0.07"/>\n`

  // Optional title
  if (title) {
    o += `<text x="${W / 2}" y="46" text-anchor="middle" font-size="8.5" fill="${AMBER}" font-family="${FONT}" opacity="0">`
    o += `<animate attributeName="opacity" from="0" to="0.35" dur="0.6s" fill="freeze" begin="0s"/>`
    o += `${e(tr(title, 24).toUpperCase())}</text>\n`
  }

  S.forEach((stage, i) => {
    const cx  = centers[i]
    const bx  = cx - BW / 2
    const d0  = d(0.2 + i * 0.18)
    const d1  = d(0.36 + i * 0.18)
    const lbl = e(tr(stage.label, 9).toUpperCase())
    const sub = stage.sublabel ? e(tr(stage.sublabel, 11)) : null

    // Step number above box
    o += `<text x="${cx}" y="${BY - 10}" text-anchor="middle" font-size="6.5" fill="${AMBER}" font-family="${FONT}" opacity="0">`
    o += `<animate attributeName="opacity" from="0" to="0.28" dur="0.4s" fill="freeze" begin="${d0}"/>0${i + 1}</text>\n`

    // Stage box
    o += `<rect x="${bx}" y="${BY}" width="${BW}" height="${BH}" rx="2" stroke="${AMBER}" stroke-width="0.9" fill="${AMBER}" fill-opacity="0" opacity="0">`
    o += `<animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" begin="${d0}"/>`
    o += `<animate attributeName="fill-opacity" from="0" to="0.05" dur="0.4s" fill="freeze" begin="${d0}"/></rect>\n`

    // Label inside box
    o += `<text x="${cx}" y="${FY + 4}" text-anchor="middle" font-size="8.5" fill="${AMBER}" font-family="${FONT}" opacity="0">`
    o += `<animate attributeName="opacity" from="0" to="0.85" dur="0.4s" fill="freeze" begin="${d1}"/>${lbl}</text>\n`

    // Sublabel below box
    if (sub) {
      o += `<text x="${cx}" y="${BY + BH + 17}" text-anchor="middle" font-size="6.5" fill="${AMBER}" font-family="${FONT}" opacity="0">`
      o += `<animate attributeName="opacity" from="0" to="0.36" dur="0.4s" fill="freeze" begin="${d1}"/>${sub}</text>\n`
    }

    // Arrow to next stage
    if (i < n - 1) {
      const ax1  = cx + BW / 2 + 3
      const ax2  = centers[i + 1] - BW / 2 - 3
      const len  = ax2 - ax1
      const dad  = d(0.44 + i * 0.18)
      o += `<line x1="${ax1}" y1="${FY}" x2="${ax2}" y2="${FY}" stroke="${AMBER}" stroke-width="0.7" opacity="0.22" stroke-dasharray="${len}" stroke-dashoffset="${len}">`
      o += `<animate attributeName="stroke-dashoffset" from="${len}" to="0" dur="0.32s" fill="freeze" begin="${dad}"/></line>\n`
      o += `<path d="M ${ax2 - 5} ${FY - 3} L ${ax2} ${FY} L ${ax2 - 5} ${FY + 3}" stroke="${AMBER}" stroke-width="0.7" fill="none" opacity="0">`
      o += `<animate attributeName="opacity" from="0" to="0.22" dur="0.2s" fill="freeze" begin="${dad}"/></path>\n`
    }
  })

  // Animated particle flowing left → right, looping
  o += `<circle r="3" fill="${AMBER}">`
  o += `<animateMotion dur="2.2s" repeatCount="indefinite" begin="1.2s" calcMode="linear"><mpath href="#fp"/></animateMotion>`
  o += `<animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.2s" repeatCount="indefinite" begin="1.2s"/>`
  o += `</circle>\n`

  o += statsRow(ST, n * 0.18 + 0.9)
  o += `</svg>`
  return o
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
// Vertical bar chart. Bars grow upward from baseline. 2–5 bars max.

export interface BarItem {
  label:        string   // max 8 chars — shown below bar
  value:        string   // max 8 chars — shown above bar
  numericValue: number   // for relative height calculation
}

export interface DashboardData {
  title?: string
  bars:   BarItem[]
  stats?: VizStat[]
}

export function renderDashboard({ title, bars, stats = [] }: DashboardData): string {
  const B  = bars.slice(0, 5)
  const n  = Math.max(B.length, 2)
  const ST = stats.slice(0, 3)

  const BASELINE = 264
  const MAX_H    = 174
  const MARGIN   = 28
  const BW       = Math.min(58, Math.floor((W - 2 * MARGIN) / n) - 14)
  const totalW   = n * BW
  const gap      = (W - 2 * MARGIN - totalW) / (n + 1)
  const startX   = MARGIN + gap

  const maxVal  = Math.max(...B.map(b => b.numericValue), 1)
  const heights = B.map(b => Math.max(24, Math.round((b.numericValue / maxVal) * MAX_H)))
  const peakH   = Math.max(...heights)

  let o = `<svg viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">\n`

  if (title) {
    o += `<text x="${W / 2}" y="46" text-anchor="middle" font-size="8.5" fill="${AMBER}" font-family="${FONT}" opacity="0">`
    o += `<animate attributeName="opacity" from="0" to="0.35" dur="0.6s" fill="freeze" begin="0s"/>`
    o += `${e(tr(title, 24).toUpperCase())}</text>\n`
  }

  // Baseline axis
  o += `<line x1="${MARGIN}" y1="${BASELINE}" x2="${W - MARGIN}" y2="${BASELINE}" stroke="${AMBER}" stroke-width="0.8" opacity="0.18"/>\n`

  B.forEach((bar, i) => {
    const bx     = startX + i * (BW + gap)
    const cx     = bx + BW / 2
    const h      = heights[i]
    const isPeak = h === peakH
    const d0     = d(0.18 + i * 0.13)
    const d1     = d(0.88 + i * 0.13)

    o += `<rect x="${bx.toFixed(1)}" y="${BASELINE}" width="${BW}" height="0" rx="1" fill="${AMBER}" fill-opacity="${isPeak ? 0.2 : 0.08}" stroke="${AMBER}" stroke-opacity="${isPeak ? 0.65 : 0.28}" stroke-width="0.8">`
    o += `<animate attributeName="height" from="0" to="${h}" dur="0.85s" fill="freeze" begin="${d0}" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>`
    o += `<animate attributeName="y" from="${BASELINE}" to="${BASELINE - h}" dur="0.85s" fill="freeze" begin="${d0}" calcMode="spline" keySplines="0.25 0.1 0.25 1"/></rect>\n`

    // Value above bar — positioned at final bar top, safe from top edge
    const valY = Math.max(32, BASELINE - h - 7)
    o += `<text x="${cx.toFixed(1)}" y="${valY}" text-anchor="middle" font-size="${isPeak ? 10 : 8.5}" fill="${AMBER}" font-family="${FONT}" font-weight="${isPeak ? "bold" : "normal"}" opacity="0">`
    o += `<animate attributeName="opacity" from="0" to="${isPeak ? 0.9 : 0.55}" dur="0.4s" fill="freeze" begin="${d1}"/>${e(tr(bar.value, 8))}</text>\n`

    // Category label below baseline
    o += `<text x="${cx.toFixed(1)}" y="${BASELINE + 15}" text-anchor="middle" font-size="7" fill="${AMBER}" font-family="${FONT}" opacity="0">`
    o += `<animate attributeName="opacity" from="0" to="0.42" dur="0.4s" fill="freeze" begin="${d0}"/>${e(tr(bar.label, 8).toUpperCase())}</text>\n`
  })

  o += statsRow(ST, n * 0.13 + 1.1)
  o += `</svg>`
  return o
}

// ─── Radial ───────────────────────────────────────────────────────────────────
// Hub node at centre, satellite nodes arranged in a circle.
// 3–6 satellites. Lines drawn progressively, nodes fade in.

export interface RadialNode {
  label:     string   // max 9 chars
  sublabel?: string   // max 11 chars
}

export interface RadialData {
  title?: string
  hub:    string       // max 9 chars — shown in centre circle
  nodes:  RadialNode[]
  stats?: VizStat[]
}

export function renderRadial({ title, hub, nodes, stats = [] }: RadialData): string {
  const N  = nodes.slice(0, 6)
  const n  = Math.max(N.length, 3)
  const ST = stats.slice(0, 3)

  const CX = 240, CY = 166, R = 112

  type Pos = { x: number; y: number; angle: number }
  const pos: Pos[] = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    return { x: CX + Math.cos(angle) * R, y: CY + Math.sin(angle) * R, angle }
  })

  let o = `<svg viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">\n`

  if (title) {
    o += `<text x="${W / 2}" y="44" text-anchor="middle" font-size="8.5" fill="${AMBER}" font-family="${FONT}" opacity="0">`
    o += `<animate attributeName="opacity" from="0" to="0.35" dur="0.6s" fill="freeze" begin="0s"/>`
    o += `${e(tr(title, 24).toUpperCase())}</text>\n`
  }

  // Outer ring (very subtle)
  o += `<circle cx="${CX}" cy="${CY}" r="${R}" stroke="${AMBER}" stroke-width="0.3" opacity="0.07"/>\n`

  // Connection lines — draw progressively
  pos.forEach((p, i) => {
    const len = R.toFixed(1)
    const dd  = d(0.14 + i * 0.1)
    o += `<line x1="${CX}" y1="${CY}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${AMBER}" stroke-width="0.7" opacity="0.18" stroke-dasharray="${len}" stroke-dashoffset="${len}">`
    o += `<animate attributeName="stroke-dashoffset" from="${len}" to="0" dur="0.5s" fill="freeze" begin="${dd}"/></line>\n`
  })

  // Hub circle
  o += `<circle cx="${CX}" cy="${CY}" r="28" stroke="${AMBER}" stroke-width="0.9" fill="${AMBER}" fill-opacity="0.06" opacity="0">`
  o += `<animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" begin="0.1s"/></circle>\n`
  // Pulsing ring
  o += `<circle cx="${CX}" cy="${CY}" r="28" stroke="${AMBER}" stroke-width="0.4" fill="none" opacity="0">`
  o += `<animate attributeName="opacity" values="0;0.2;0" dur="2.8s" repeatCount="indefinite" begin="1.2s"/>`
  o += `<animate attributeName="r" values="28;37;28" dur="2.8s" repeatCount="indefinite" begin="1.2s"/></circle>\n`

  // Hub label
  o += `<text x="${CX}" y="${CY + 4}" text-anchor="middle" font-size="9" fill="${AMBER}" font-family="${FONT}" opacity="0.85">${e(tr(hub, 9).toUpperCase())}</text>\n`

  // Satellite nodes + labels
  pos.forEach((p, i) => {
    const d0   = d(0.36 + i * 0.12)
    const d1   = d(0.48 + i * 0.12)
    const node = N[i] ?? { label: "" }
    const lbl  = e(tr(node.label, 9).toUpperCase())
    const sub  = node.sublabel ? e(tr(node.sublabel, 11)) : null

    // Satellite dot
    o += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${AMBER}" fill-opacity="0.65" opacity="0">`
    o += `<animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin="${d0}"/></circle>\n`

    // Label placement — determine side and safe x position
    const cosA = Math.cos(p.angle)
    const sinA = Math.sin(p.angle)
    let lx: number, ly: number, anchor: string

    if (Math.abs(cosA) >= 0.42) {
      // Node clearly on left or right side
      const side = cosA > 0 ? 1 : -1
      lx = p.x + side * 16
      ly = p.y + 3.5
      anchor = cosA > 0 ? "start" : "end"
      // Clamp: at font-size 8, ~9 chars ≈ 43px wide
      if (anchor === "start") lx = Math.min(lx, 460 - 43)
      else                    lx = Math.max(lx, 20 + 43)
    } else {
      // Near top or bottom — centre label, shift vertically
      lx     = Math.max(20, Math.min(460, p.x))
      ly     = sinA < 0 ? p.y - 14 : p.y + 18
      anchor = "middle"
    }

    // Clamp ly to safe zone
    ly = Math.max(20, Math.min(300, ly))

    o += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" font-size="8" fill="${AMBER}" font-family="${FONT}" opacity="0">`
    o += `<animate attributeName="opacity" from="0" to="0.68" dur="0.3s" fill="freeze" begin="${d1}"/>${lbl}</text>\n`

    if (sub) {
      const subY = Math.max(20, Math.min(300, anchor === "middle" && sinA < 0 ? ly - 12 : ly + 12))
      o += `<text x="${lx.toFixed(1)}" y="${subY.toFixed(1)}" text-anchor="${anchor}" font-size="6.5" fill="${AMBER}" font-family="${FONT}" opacity="0">`
      o += `<animate attributeName="opacity" from="0" to="0.35" dur="0.3s" fill="freeze" begin="${d1}"/>${sub}</text>\n`
    }
  })

  o += statsRow(ST, n * 0.12 + 0.7)
  o += `</svg>`
  return o
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export type VizData =
  | ({ type: "pipeline"  } & PipelineData)
  | ({ type: "dashboard" } & DashboardData)
  | ({ type: "radial"    } & RadialData)

export function renderViz(data: VizData): string {
  switch (data.type) {
    case "pipeline":  return renderPipeline(data)
    case "dashboard": return renderDashboard(data)
    case "radial":    return renderRadial(data)
  }
}
