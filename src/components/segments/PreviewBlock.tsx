"use client"

import { motion } from "framer-motion"
import type { PreviewContent } from "@/types"

export default function PreviewBlock({ content }: { content: PreviewContent }) {
  return (
    <section className="px-8 py-12 max-w-6xl mx-auto w-full">
      <div className="relative rounded-2xl overflow-hidden border border-border glass">
        {content.video_url ? (
          <video
            src={content.video_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full aspect-video object-cover"
          />
        ) : content.mockup_images?.[0] ? (
          <img
            src={content.mockup_images[0]}
            alt={content.caption}
            className="w-full aspect-video object-cover"
          />
        ) : (
          <div className="w-full aspect-video bg-elevated flex items-center justify-center">
            <span className="font-mono text-xs text-muted-foreground">Preview coming soon</span>
          </div>
        )}
        {/* Scan line overlay on video */}
        <motion.div
          className="pointer-events-none absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/40 to-transparent"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>
      {content.caption && (
        <p className="mt-4 text-center text-sm text-muted-foreground">{content.caption}</p>
      )}
    </section>
  )
}
