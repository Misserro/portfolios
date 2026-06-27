"use client"

import type { PreviewContent } from "@/types"

export default function PreviewBlock({ content }: { content: PreviewContent }) {
  return (
    <section className="px-8 py-4 max-w-5xl">
      <div className="relative rounded overflow-hidden border border-border">
        {/* Amber corner marks — instrument feel */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-amber z-10" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-amber z-10" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-amber z-10" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-amber z-10" />

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
          <div className="w-full aspect-video bg-surface flex items-center justify-center">
            <span className="font-mono text-xs text-slate">Preview coming soon</span>
          </div>
        )}
      </div>
      {content.caption && (
        <p className="mt-3 font-mono text-xs text-slate text-center">{content.caption}</p>
      )}
    </section>
  )
}
