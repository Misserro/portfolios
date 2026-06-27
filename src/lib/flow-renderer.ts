export interface FlowStep {
  title: string
  description?: string
}

// Truncate to fit inside a node label — split into max 2 lines of maxChars each
function splitLabel(title: string, maxChars = 9): [string, string?] {
  const words = title.split(/\s+/)
  if (words.join(" ").length <= maxChars) return [words.join(" ")]

  let line1 = ""
  let line2 = ""
  for (const w of words) {
    if ((line1 + (line1 ? " " : "") + w).length <= maxChars) {
      line1 += (line1 ? " " : "") + w
    } else {
      line2 += (line2 ? " " : "") + w
    }
  }
  if (line2.length > maxChars) line2 = line2.slice(0, maxChars - 1) + "…"
  return [line1, line2 || undefined]
}

export function renderFlow(steps: FlowStep[]): string {
  const W = 480
  const H = 200
  const count = steps.length
  if (count === 0) return ""

  // Node geometry
  const R = 18                  // circle radius
  const MARGIN_X = 40
  const NODE_Y = 90             // center y of nodes

  const xs: number[] = count === 1
    ? [W / 2]
    : steps.map((_, i) => MARGIN_X + (i * (W - 2 * MARGIN_X)) / (count - 1))

  // Path through all node centers (for animateMotion)
  const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${NODE_Y}`).join(" ")

  // Duration: 0.9s per segment, 0.4s pause at each node
  const totalDur = (count - 1) * 0.9 + count * 0.4

  const lines = xs.slice(0, -1).map((x, i) => {
    const nx = xs[i + 1]
    const x1 = x + R + 3
    const x2 = nx - R - 3
    // Arrowhead at x2
    return `
  <line x1="${x1}" y1="${NODE_Y}" x2="${x2 - 6}" y2="${NODE_Y}" stroke="#F2843C" stroke-width="0.7" opacity="0.25"/>
  <path d="M${x2 - 8} ${NODE_Y - 4} L${x2} ${NODE_Y} L${x2 - 8} ${NODE_Y + 4}" stroke="#F2843C" stroke-width="0.8" fill="none" opacity="0.4"/>`
  }).join("")

  const nodes = xs.map((x, i) => {
    const [line1, line2] = splitLabel(steps[i].title.toUpperCase())
    const labelY1 = line2 ? NODE_Y + R + 14 : NODE_Y + R + 16
    const labelY2 = NODE_Y + R + 26
    const numY = NODE_Y - R - 7

    return `
  <circle cx="${x}" cy="${NODE_Y}" r="${R}" stroke="#F2843C" stroke-width="0.9" fill="#F2843C" fill-opacity="0.05"/>
  <text x="${x}" y="${numY}" text-anchor="middle" font-size="7" fill="#F2843C" fill-opacity="0.35" font-family="monospace">${String(i + 1).padStart(2, "0")}</text>
  <text x="${x}" y="${labelY1}" text-anchor="middle" font-size="8" fill="#F2843C" fill-opacity="0.75" font-family="monospace">${line1}</text>${line2 ? `
  <text x="${x}" y="${labelY2}" text-anchor="middle" font-size="8" fill="#F2843C" fill-opacity="0.75" font-family="monospace">${line2}</text>` : ""}`
  }).join("")

  return `<svg viewBox="0 0 480 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <path id="fp" d="${pathD}"/>
  </defs>
  ${lines}
  ${nodes}
  <circle r="4.5" fill="#F2843C" fill-opacity="0.95">
    <animateMotion dur="${totalDur.toFixed(1)}s" repeatCount="indefinite" rotate="auto">
      <mpath href="#fp"/>
    </animateMotion>
  </circle>
</svg>`
}
