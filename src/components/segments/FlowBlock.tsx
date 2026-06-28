"use client"

import dynamic from "next/dynamic"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { FlowContent } from "@/types"

// React Flow must be client-only and cannot SSR
const FlowCanvas = dynamic(() => import("@/components/flow/FlowCanvas"), { ssr: false })

export default function FlowBlock({ content }: { content: FlowContent }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const { schema } = content

  if (!schema?.nodes?.length) return null

  return (
    <section className="w-full py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center gap-4 mb-10">
          <span className="font-mono text-xs text-amber uppercase tracking-widest">
            {schema.title ?? "Explore what we can do"}
          </span>
          <div className="rule-amber flex-1" />
        </div>

        {/* Desktop: React Flow interactive diagram */}
        <motion.div
          className="hidden lg:block w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <FlowCanvas schema={schema} />
          <p className="mt-3 font-mono text-[10px] text-slate/40 text-center">
            click a path to explore — click any node to backtrack
          </p>
        </motion.div>

        {/* Mobile: linear step list fallback */}
        <div className="lg:hidden flex flex-col gap-0 max-w-2xl">
          {schema.nodes
            .filter(n => n.type !== "decision")
            .map((node, i) => (
              <motion.div
                key={node.id}
                className="flex gap-8 pb-10 last:pb-0"
                initial={{ opacity: 0, x: -8 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="flex flex-col items-center gap-0 shrink-0 pt-1">
                  <span className={`font-mono text-xs tabular-nums ${node.type === "outcome" ? "text-amber" : "text-amber/50"}`}>
                    {node.type === "outcome" ? "✓" : String(i + 1).padStart(2, "0")}
                  </span>
                  {i < schema.nodes.filter(n => n.type !== "decision").length - 1 && (
                    <div className="w-px flex-1 bg-border mt-3 min-h-8" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5 pb-10 last:pb-0">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {node.label}
                  </h3>
                  {node.description && (
                    <p className="text-sm text-slate leading-relaxed">{node.description}</p>
                  )}
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </section>
  )
}
