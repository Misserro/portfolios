"use client"

import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react"
import { motion } from "framer-motion"

export interface FlowNodeData extends Record<string, unknown> {
  label: string
  description?: string
  stepIndex?: number
  active: boolean
  isCurrentTip: boolean
  pendingEdges?: Array<{ from: string; to: string; label?: string }>
  onChoose?: (edge: { from: string; to: string; label?: string }) => void
}

export default function FlowStepNode({ data, id }: NodeProps) {
  const d = data as FlowNodeData

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`w-[180px] rounded-sm border px-4 py-3 cursor-default select-none transition-all duration-300 ${
        d.active
          ? "bg-[#16181F] border-[#F4A23A] shadow-[0_0_18px_rgba(242,132,60,0.18)]"
          : "bg-[#111217] border-[rgba(255,255,255,0.08)]"
      }`}
      data-nodeid={id}
    >
      {d.stepIndex !== undefined && (
        <span className="block font-mono text-[10px] text-[#F4A23A]/60 mb-1.5 tabular-nums">
          {String(d.stepIndex + 1).padStart(2, "0")}
        </span>
      )}
      <p className={`font-display text-sm font-semibold leading-snug ${d.active ? "text-[#F4F5F7]" : "text-[#F4F5F7]/70"}`}>
        {d.label}
      </p>
      {d.description && (
        <p className="mt-1 font-mono text-[10px] text-[#8A8F98] leading-relaxed line-clamp-2">
          {d.description}
        </p>
      )}
      {d.isCurrentTip && (!d.pendingEdges || d.pendingEdges.length === 0) && (
        <span className="mt-2 block w-1.5 h-1.5 rounded-full bg-[#F4A23A] animate-pulse" />
      )}
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
      {d.isCurrentTip && d.pendingEdges && d.pendingEdges.length > 0 && (
        <NodeToolbar isVisible position={Position.Bottom}>
          <div className="flex gap-1.5 pt-1">
            {d.pendingEdges.map((e, i) => (
              <button
                key={i}
                onClick={() => d.onChoose?.(e)}
                className="font-mono text-[10px] border border-[#F4A23A]/40 text-[#F4A23A] bg-[#08090B] px-2.5 py-1 rounded-sm hover:bg-[#F4A23A]/10 hover:border-[#F4A23A]/70 transition-all duration-200 whitespace-nowrap cursor-pointer"
              >
                {e.label || "→"}
              </button>
            ))}
          </div>
        </NodeToolbar>
      )}
    </motion.div>
  )
}
