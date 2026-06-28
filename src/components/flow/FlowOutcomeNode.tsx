"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { motion } from "framer-motion"
import type { FlowNodeData } from "./FlowStepNode"

export default function FlowOutcomeNode({ data, id }: NodeProps) {
  const d = data as FlowNodeData

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`w-[180px] rounded-full border px-5 py-3 cursor-default select-none transition-all duration-300 ${
        d.active
          ? "bg-[rgba(244,162,58,0.08)] border-[#F4A23A] shadow-[0_0_24px_rgba(242,132,60,0.22)]"
          : "bg-[#111217] border-[rgba(255,255,255,0.12)]"
      }`}
      data-nodeid={id}
    >
      <div className="flex items-center gap-2">
        <span className={`text-sm ${d.active ? "text-[#F4A23A]" : "text-[#F4F5F7]/30"}`}>✓</span>
        <p className={`font-display text-sm font-semibold leading-snug ${d.active ? "text-[#F4F5F7]" : "text-[#F4F5F7]/60"}`}>
          {d.label}
        </p>
      </div>
      {d.description && d.active && (
        <p className="mt-1.5 font-mono text-[10px] text-[#8A8F98] leading-relaxed">
          {d.description}
        </p>
      )}
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
    </motion.div>
  )
}
