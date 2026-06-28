"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { motion } from "framer-motion"
import type { FlowNodeData } from "./FlowStepNode"

export default function FlowDecisionNode({ data, id }: NodeProps) {
  const d = data as FlowNodeData

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-[140px] h-[70px] flex items-center justify-center cursor-default select-none"
      data-nodeid={id}
    >
      {/* Diamond shape */}
      <div
        className={`absolute inset-0 rotate-45 rounded-sm border transition-all duration-300 ${
          d.active
            ? "bg-[#16181F] border-[#F4A23A] shadow-[0_0_18px_rgba(242,132,60,0.18)]"
            : "bg-[#111217] border-[rgba(255,255,255,0.08)]"
        }`}
        style={{ margin: "12px" }}
      />
      <p
        className={`relative z-10 font-display text-xs font-semibold text-center leading-tight px-4 ${
          d.active ? "text-[#F4F5F7]" : "text-[#F4F5F7]/70"
        }`}
      >
        {d.label}
      </p>
      {d.isCurrentTip && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#F4A23A] animate-pulse z-10" />
      )}
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" id="bottom" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
    </motion.div>
  )
}
