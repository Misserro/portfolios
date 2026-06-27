export interface FlowStep {
  title: string
  description?: string
}

export function renderFlow(steps: FlowStep[]): string {
  const count = steps.length
  if (count === 0) return ""

  const W = 480
  const H = 120
  const MARGIN = 52
  const cy = 60
  const LOOP = 3.5

  // Chip-style node dimensions
  const NW = 38
  const NH = 24
  const NRX = 4

  const xs = steps.map((_, i) =>
    count === 1 ? W / 2 : MARGIN + (i * (W - 2 * MARGIN)) / (count - 1)
  )

  // Zigzag: even nodes top, odd nodes bottom — creates a non-linear, dynamic layout
  const ys = count === 1
    ? [cy]
    : steps.map((_, i) => (i % 2 === 0 ? cy - 19 : cy + 19))

  // Dot animateMotion path: smooth cubic bezier through every node center
  const dotPathParts = [`M ${xs[0].toFixed(1)} ${ys[0]}`]
  for (let i = 0; i < count - 1; i++) {
    const x0 = xs[i], y0 = ys[i]
    const x1 = xs[i + 1], y1 = ys[i + 1]
    const arm = Math.max((x1 - x0) * 0.42, 14)
    dotPathParts.push(
      `C ${(x0 + arm).toFixed(1)} ${y0} ${(x1 - arm).toFixed(1)} ${y1} ${x1.toFixed(1)} ${y1}`
    )
  }
  const dotPath = dotPathParts.join(" ")

  // Edge-to-edge bezier connections with marching dashes
  const DASH_PERIOD = 9
  const connections = xs.slice(0, -1).map((x, i) => {
    const x0 = x, y0 = ys[i]
    const x1 = xs[i + 1], y1 = ys[i + 1]
    const ex0 = x0 + NW / 2 + 2
    const ex1 = x1 - NW / 2 - 2
    const arm = Math.max((ex1 - ex0) * 0.42, 10)
    const d = `M ${ex0.toFixed(1)} ${y0} C ${(ex0 + arm).toFixed(1)} ${y0} ${(ex1 - arm).toFixed(1)} ${y1} ${ex1.toFixed(1)} ${y1}`
    return `
  <path d="${d}" stroke="#F2843C" stroke-width="0.5" fill="none" stroke-opacity="0.13"/>
  <path d="${d}" stroke="#F2843C" stroke-width="0.9" fill="none" stroke-dasharray="3 6" stroke-opacity="0.4">
    <animate attributeName="stroke-dashoffset" from="${DASH_PERIOD}" to="0" dur="${LOOP}s" repeatCount="indefinite"/>
  </path>`
  }).join("")

  // Chip nodes: glow halo + animated border + fill flash on arrival
  const nodes = xs.map((x, i) => {
    const y = ys[i]
    const pulseBegin = count > 1 ? ((i / (count - 1)) * LOOP).toFixed(2) : "0"
    const rx = (x - NW / 2).toFixed(1)
    const ry = (y - NH / 2).toFixed(1)
    const gx = (x - NW / 2 - 5).toFixed(1)
    const gy = (y - NH / 2 - 5).toFixed(1)
    return `
  <rect x="${gx}" y="${gy}" width="${NW + 10}" height="${NH + 10}" rx="${NRX + 4}" fill="#F2843C" fill-opacity="0">
    <animate attributeName="fill-opacity" values="0;0.09;0" keyTimes="0;0.12;0.5"
      dur="${LOOP}s" begin="${pulseBegin}s" repeatCount="indefinite"/>
  </rect>
  <rect x="${rx}" y="${ry}" width="${NW}" height="${NH}" rx="${NRX}"
    stroke="#F2843C" fill="#F2843C" fill-opacity="0.06">
    <animate attributeName="stroke-opacity" values="0.35;1;0.35" keyTimes="0;0.1;0.4"
      dur="${LOOP}s" begin="${pulseBegin}s" repeatCount="indefinite"/>
    <animate attributeName="stroke-width" values="0.8;1.4;0.8" keyTimes="0;0.1;0.4"
      dur="${LOOP}s" begin="${pulseBegin}s" repeatCount="indefinite"/>
    <animate attributeName="fill-opacity" values="0.06;0.18;0.06" keyTimes="0;0.1;0.4"
      dur="${LOOP}s" begin="${pulseBegin}s" repeatCount="indefinite"/>
  </rect>
  <text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle"
    font-size="8" fill="#F2843C" fill-opacity="0.45" font-family="monospace">${String(i + 1).padStart(2, "0")}</text>`
  }).join("")

  // Signal dot: soft halo + bright core + trailing ghost
  const dot = `
  <circle r="7" fill="#F2843C" fill-opacity="0">
    <animateMotion dur="${LOOP}s" repeatCount="indefinite"><mpath href="#fp"/></animateMotion>
    <animate attributeName="fill-opacity" values="0;0.07;0.07;0" keyTimes="0;0.04;0.88;1" dur="${LOOP}s" repeatCount="indefinite"/>
  </circle>
  <circle r="3.5" fill="#F2843C">
    <animateMotion dur="${LOOP}s" repeatCount="indefinite"><mpath href="#fp"/></animateMotion>
    <animate attributeName="fill-opacity" values="0;1;1;0" keyTimes="0;0.04;0.88;1" dur="${LOOP}s" repeatCount="indefinite"/>
  </circle>
  <circle r="2" fill="#F2843C">
    <animateMotion dur="${LOOP}s" repeatCount="indefinite" begin="-0.15s"><mpath href="#fp"/></animateMotion>
    <animate attributeName="fill-opacity" values="0;0.4;0.4;0" keyTimes="0;0.04;0.88;1" dur="${LOOP}s" repeatCount="indefinite" begin="-0.15s"/>
  </circle>`

  return `<svg viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs><path id="fp" d="${dotPath}"/></defs>
  ${connections}
  ${nodes}
  ${dot}
</svg>`
}
