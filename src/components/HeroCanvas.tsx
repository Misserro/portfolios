"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

const AMBER_R = 212
const AMBER_G = 168
const AMBER_B = 83
const CONNECTION_DIST = 130
const SPEED = 0.28

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Bind to locals so inner functions don't re-check nullability
    const c = canvas
    const g = ctx

    let animId: number
    let particles: Particle[] = []
    let w = 0
    let h = 0
    let dpr = 1

    function resize() {
      dpr = Math.min(window.devicePixelRatio ?? 1, 2)
      w = c.offsetWidth
      h = c.offsetHeight
      c.width = w * dpr
      c.height = h * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function init() {
      resize()
      // Scale particle count to viewport area — denser on larger screens
      const count = Math.min(120, Math.max(40, Math.floor((w * h) / 14000)))
      particles = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2
        const speed = SPEED * (0.4 + Math.random() * 0.6)
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 0.8 + Math.random() * 1.0,
          opacity: 0.25 + Math.random() * 0.45,
        }
      })
    }

    function draw() {
      g.clearRect(0, 0, w, h)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        // Wrap edges with a 10px buffer so particles don't pop
        if (p.x < -10) p.x = w + 10
        else if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        else if (p.y > h + 10) p.y = -10
      }

      // Connections
      g.lineWidth = 0.7
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distSq = dx * dx + dy * dy
          if (distSq < CONNECTION_DIST * CONNECTION_DIST) {
            const alpha = (1 - Math.sqrt(distSq) / CONNECTION_DIST) * 0.13
            g.strokeStyle = `rgba(${AMBER_R},${AMBER_G},${AMBER_B},${alpha})`
            g.beginPath()
            g.moveTo(particles[i].x, particles[i].y)
            g.lineTo(particles[j].x, particles[j].y)
            g.stroke()
          }
        }
      }

      // Dots
      for (const p of particles) {
        g.fillStyle = `rgba(${AMBER_R},${AMBER_G},${AMBER_B},${p.opacity})`
        g.beginPath()
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        g.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    init()
    draw()

    const ro = new ResizeObserver(() => {
      const prevW = w, prevH = h
      resize()
      if (prevW && prevH) {
        for (const p of particles) {
          p.x = (p.x / prevW) * w
          p.y = (p.y / prevH) * h
        }
      }
    })
    ro.observe(c)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}
