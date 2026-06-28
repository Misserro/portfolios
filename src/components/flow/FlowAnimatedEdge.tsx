"use client"

import { getBezierPath, type EdgeProps } from "@xyflow/react"
import { useEffect, useRef } from "react"

export interface FlowEdgeData extends Record<string, unknown> {
  label?: string
  active: boolean
  pending: boolean
}

export default function FlowAnimatedEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data,
}: EdgeProps) {
  const d = data as FlowEdgeData
  const pathRef = useRef<SVGPathElement>(null)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  // Draw-in animation on mount via strokeDasharray/strokeDashoffset
  useEffect(() => {
    const el = pathRef.current
    if (!el) return
    const len = el.getTotalLength()
    el.style.strokeDasharray = `${len}`
    el.style.strokeDashoffset = `${len}`
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "stroke-dashoffset 0.5s cubic-bezier(0.22,1,0.36,1)"
        el.style.strokeDashoffset = "0"
      })
    })
  }, [])

  const strokeColor = d.active ? "#F4A23A" : d.pending ? "rgba(244,162,58,0.35)" : "rgba(255,255,255,0.08)"
  const strokeWidth = d.active ? 1.5 : 1
  const markerEnd = d.active ? "url(#arrow-amber)" : "url(#arrow-dim)"

  return (
    <>
      {/* Invisible wide path for easier interaction */}
      <path
        id={`${id}-interaction`}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      {/* Visible animated path */}
      <path
        ref={pathRef}
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        markerEnd={markerEnd}
        style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
      />
      {d.active && d.label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="react-flow__edge-text"
          style={{ fontSize: 9, fill: "rgba(244,162,58,0.55)", fontFamily: "monospace" }}
        >
          {d.label}
        </text>
      )}
    </>
  )
}
