"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import type { AIMessage, AIFileAttachment } from "@/types"
import FlowBuilder from "@/components/admin/FlowBuilder"
import type { FlowSchema } from "@/types/flow"

type Phase = "clarifying" | "form_review" | "preview"

interface SegmentMap {
  hero?: { headline: string; subheadline?: string; description: string; tags: string[]; logo_url?: string }
  features?: { features: { title: string; description: string; icon_svg?: string }[] }
  how_it_works?: { steps: { title: string; description: string }[]; flow_svg?: string }
  stats?: { stats: { label: string; value: string; note?: string }[] }
  cta?: { headline: string; description: string; button_label: string; button_url: string }
  map?: { label?: string; countries: string[]; cities: { name: string; coordinates: [number, number] }[]; center: [number, number]; scale: number }
  interactive_flow?: { schema: FlowSchema }
}

interface Form {
  name: string
  slug: string
  tagline: string
  segments: SegmentMap
}

interface CorrectionMessage {
  role: "user" | "assistant"
  content: string
}

interface Props {
  productId: string
  sessionId: string
  productName: string
  onComplete: () => void
}

export default function AIBuilder({ productId, sessionId, productName, onComplete }: Props) {
  const [phase, setPhase]               = useState<Phase>("clarifying")
  const [messages, setMessages]         = useState<AIMessage[]>([])
  const [input, setInput]               = useState("")
  const [streaming, setStreaming]       = useState(false)
  const [streamText, setStreamText]     = useState("")
  const [form, setForm]                 = useState<Form | null>(null)
  const [generating, setGenerating]         = useState(false)
  const [generatingVisuals, setGeneratingVisuals] = useState(false)
  const [publishing, setPublishing]     = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set())
  const [urlOpen, setUrlOpen]         = useState(false)
  const [urlInput, setUrlInput]       = useState("")
  const [scrapingUrl, setScrapingUrl] = useState(false)
  const [urlError, setUrlError]       = useState("")

  // Phase 3 state
  const [previewSlug, setPreviewSlug]             = useState("")
  const [savingPreview, setSavingPreview]         = useState(false)
  const [correctionMessages, setCorrectionMessages] = useState<CorrectionMessage[]>([])
  const [correctionInput, setCorrectionInput]     = useState("")
  const [correcting, setCorrecting]               = useState(false)

  const bottomRef        = useRef<HTMLDivElement>(null)
  const correctionEndRef = useRef<HTMLDivElement>(null)
  const fileRef          = useRef<HTMLInputElement>(null)
  const iframeRef        = useRef<HTMLIFrameElement>(null)
  const hasBooted        = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamText])

  useEffect(() => {
    correctionEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [correctionMessages, correcting])

  const sendMessage = useCallback(async (content: string, attachments?: AIFileAttachment[]) => {
    if (streaming) return
    setMessages(prev => [...prev, {
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      ...(attachments?.length ? { attachments } : {}),
    }])
    setInput("")
    setStreaming(true)
    setStreamText("")

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: content, attachments }),
      })
      if (!res.body) throw new Error()

      const reader     = res.body.getReader()
      const decoder    = new TextDecoder()
      let accumulated  = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))
        for (const line of lines) {
          const data = JSON.parse(line.slice(6))
          if (data.text) { accumulated += data.text; setStreamText(accumulated) }
          if (data.done) {
            setMessages(prev => [...prev, { role: "assistant", content: accumulated, timestamp: new Date().toISOString() }])
            setStreamText("")
          }
        }
      }
    } catch {
      toast.error("Message failed")
    } finally {
      setStreaming(false)
    }
  }, [streaming, sessionId])

  useEffect(() => {
    if (hasBooted.current) return
    hasBooted.current = true
    sendMessage(`I want to create a product page for "${productName}". Please start by asking me what you need to know.`)
  }, [productName, sendMessage])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) { toast.error((await res.json()).error ?? "Upload failed"); return }
      const { anthropicFileId, extractedText, name, type: contentType } = await res.json()
      if (anthropicFileId) {
        await sendMessage(
          `I've attached "${name}" for context.`,
          [{ file_id: anthropicFileId, content_type: contentType, name }]
        )
      } else if (extractedText) {
        await sendMessage(
          `Here is the content of "${name}":\n\n${extractedText}`
        )
      } else {
        toast.info(`${name} uploaded`)
      }
    } catch { toast.error("Upload failed") }
    finally { setUploadingFile(false); if (fileRef.current) fileRef.current.value = "" }
  }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = urlInput.trim()
    if (!trimmed) return
    setScrapingUrl(true)
    setUrlError("")
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setUrlError(data.error ?? "Failed to fetch"); return }
      await sendMessage(
        `Here is the content scraped from "${data.title || trimmed}" (${trimmed}):\n\n${data.text}`
      )
      setUrlOpen(false)
      setUrlInput("")
    } catch { setUrlError("Network error — try again") }
    finally { setScrapingUrl(false) }
  }

  async function generateVisuals(f: Form) {
    const hero     = f.segments.hero
    const features = f.segments.features?.features ?? []
    if (!hero || features.length === 0) return
    setGeneratingVisuals(true)
    try {
      const res = await fetch("/api/ai/generate-visuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          headline:    hero.headline,
          tags:        hero.tags ?? [],
          description: hero.description ?? "",
          features,
          stats: f.segments.stats?.stats ?? [],
        }),
      })
      if (!res.ok) return
      const { iconSvgs, mapData } = await res.json()
      setForm(prev => {
        if (!prev) return prev
        const next = JSON.parse(JSON.stringify(prev)) as Form
        if (next.segments.features && iconSvgs?.length) {
          next.segments.features.features = next.segments.features.features.map(
            (feat: { title: string; description: string; icon_svg?: string }, i: number) => ({ ...feat, icon_svg: iconSvgs[i] ?? feat.icon_svg })
          )
        }
        if (mapData) {
          next.segments.map = mapData
        }
        return next
      })
    } catch {
      // Non-fatal — fallback rendering handles the missing visuals
    } finally {
      setGeneratingVisuals(false)
    }
  }

  async function handleGenerateForm() {
    setGenerating(true)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) { toast.error((await res.json()).error ?? "Failed to generate"); return }
      const { form: generatedForm } = await res.json()
      setForm(generatedForm)
      setPhase("form_review")
      const allFields = [
        "meta", "hero.headline", "hero.subheadline", "hero.description", "hero.tags",
        "features", "how_it_works", "stats", "cta", "interactive_flow",
      ]
      allFields.forEach((field, i) => {
        setTimeout(() => setRevealedFields(prev => new Set([...prev, field])), 200 + i * 120)
      })
      // Fire visual generation in the background — updates form state when ready
      generateVisuals(generatedForm)
    } catch { toast.error("Generation failed") }
    finally { setGenerating(false) }
  }

  async function handleEnterPreview() {
    if (!form) return
    setSavingPreview(true)
    try {
      const segmentOrder = ["hero", "preview", "features", "how_it_works", "stats", "map", "testimonials", "cta", "interactive_flow"] as const
      const segments = segmentOrder
        .filter(type => form.segments[type as keyof SegmentMap])
        .map((type, i) => ({
          product_id: productId,
          type,
          content: form.segments[type as keyof SegmentMap],
          visible: true,
          order: i,
        }))

      const [segRes, metaRes] = await Promise.all([
        fetch(`/api/products/${productId}/segments`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments }),
        }),
        fetch(`/api/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, slug: form.slug, tagline: form.tagline, status: "preview" }),
        }),
      ])
      if (!segRes.ok || !metaRes.ok) throw new Error()
      setPreviewSlug(form.slug)
      setPhase("preview")
    } catch { toast.error("Failed to save — try again") }
    finally { setSavingPreview(false) }
  }

  async function handleCorrection(e: React.FormEvent) {
    e.preventDefault()
    if (!correctionInput.trim() || correcting) return
    const msg = correctionInput.trim()
    setCorrectionMessages(prev => [...prev, { role: "user", content: msg }])
    setCorrectionInput("")
    setCorrecting(true)
    try {
      const res = await fetch("/api/ai/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, productId, message: msg }),
      })
      if (!res.ok) throw new Error()
      const { message, updatedSegmentType } = await res.json()
      setCorrectionMessages(prev => [...prev, { role: "assistant", content: message }])
      if (updatedSegmentType && iframeRef.current) {
        iframeRef.current.src = `/preview/${previewSlug}?highlight=${updatedSegmentType}`
      }
    } catch { toast.error("Correction failed") }
    finally { setCorrecting(false) }
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      })
      if (!res.ok) throw new Error()
      toast.success("Published")
      onComplete()
    } catch { toast.error("Publish failed") }
    finally { setPublishing(false) }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || streaming) return
    sendMessage(input.trim())
  }

  const visibleMessages = messages.filter((m, i) => !(i === 0 && m.role === "user"))

  // ─── Phase 3: Full split ───────────────────────────────────────────────────
  if (phase === "preview") {
    return (
      <div className="flex flex-col h-[calc(100vh-57px)]">
        {/* Top bar */}
        <div className="flex items-center justify-between py-5 border-b border-border shrink-0">
          <div>
            <span className="font-mono text-xs text-amber uppercase tracking-widest block mb-0.5">
              03 — Review
            </span>
            <h1 className="font-display text-xl font-bold text-foreground">{productName}</h1>
          </div>
          <button
            onClick={() => setPhase("form_review")}
            className="font-mono text-xs text-slate hover:text-foreground transition-colors px-3 py-2"
          >
            ← Edit form
          </button>
        </div>

        {/* Split body */}
        <div className="flex flex-1 min-h-0">
          {/* Iframe — dominant left */}
          <div className="flex-1 min-h-0 relative bg-background">
            <iframe
              ref={iframeRef}
              src={`/preview/${previewSlug}`}
              className="w-full h-full border-0"
              title="Product preview"
            />
          </div>

          {/* Correction sidebar — right */}
          <div className="w-[320px] shrink-0 border-l border-border flex flex-col min-h-0">
            {/* Correction label */}
            <div className="px-5 pt-5 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-amber uppercase tracking-widest">Corrections</span>
                <div className="rule-amber flex-1" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-4 pb-4">
              {correctionMessages.length === 0 && (
                <p className="font-mono text-xs text-slate/50 leading-relaxed mt-2">
                  Tell me what to fix — I&apos;ll update the right section and reload the preview.
                </p>
              )}
              {correctionMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <span className={`font-mono text-[10px] ${msg.role === "user" ? "text-slate" : "text-amber"}`}>
                    {msg.role === "user" ? "you" : "claude"}
                  </span>
                  <p className={`font-mono text-xs leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === "user"
                      ? "bg-elevated border border-border rounded-sm px-2.5 py-2 text-foreground text-right"
                      : "text-foreground/80"
                  }`}>
                    {msg.content}
                  </p>
                </div>
              ))}
              {correcting && (
                <div className="flex flex-col gap-1 items-start">
                  <span className="font-mono text-[10px] text-amber">claude</span>
                  <div className="flex gap-1 py-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1 h-1 rounded-full bg-amber/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={correctionEndRef} />
            </div>

            {/* Correction input */}
            <form onSubmit={handleCorrection} className="border-t border-border px-4 py-3 shrink-0 flex gap-2">
              <input
                type="text"
                value={correctionInput}
                onChange={e => setCorrectionInput(e.target.value)}
                placeholder="e.g. make headline shorter"
                disabled={correcting}
                className="flex-1 bg-input border border-border rounded-sm px-3 py-2 font-mono text-xs text-foreground placeholder:text-slate/40 focus:outline-none focus:border-amber/30 transition-colors disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!correctionInput.trim() || correcting}
                className="font-mono text-xs bg-amber/10 border border-amber/20 text-amber px-3 py-2 rounded-sm hover:bg-amber/20 transition-colors disabled:opacity-30"
              >
                →
              </button>
            </form>

            {/* Publish bar */}
            <div className="border-t border-border px-4 py-4 shrink-0 flex flex-col gap-2">
              <button
                onClick={onComplete}
                className="w-full font-mono text-xs border border-amber/20 text-amber px-4 py-2.5 rounded-sm hover:bg-amber/8 transition-colors text-center"
              >
                Save as preview
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full font-mono text-xs bg-amber text-background px-4 py-2.5 rounded-sm font-bold hover:bg-amber/90 transition-colors disabled:opacity-40 text-center"
              >
                {publishing ? "Publishing…" : "Publish now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Phases 1 & 2 ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between py-5 border-b border-border shrink-0">
        <div>
          <span className="font-mono text-xs text-amber uppercase tracking-widest block mb-0.5">
            {phase === "clarifying" ? "01 — Clarify" : "02 — Review"}
          </span>
          <h1 className="font-display text-xl font-bold text-foreground">{productName}</h1>
        </div>

        <div className="flex items-center gap-2">
          {phase === "clarifying" && (
            <button
              onClick={handleGenerateForm}
              disabled={generating || streaming || visibleMessages.length < 2}
              className="font-mono text-xs border border-amber/30 text-amber px-4 py-2 rounded-sm hover:bg-amber/8 transition-colors disabled:opacity-30"
            >
              {generating ? "Building form…" : "Build form →"}
            </button>
          )}
          {phase === "form_review" && (
            <>
              {generatingVisuals && (
                <span className="font-mono text-xs text-slate/50 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber/60 animate-pulse" />
                  generating visuals…
                </span>
              )}
              <button
                onClick={() => setPhase("clarifying")}
                className="font-mono text-xs text-slate hover:text-foreground transition-colors px-3 py-2"
              >
                ← Back
              </button>
              <button
                onClick={handleEnterPreview}
                disabled={savingPreview || generatingVisuals}
                className="font-mono text-xs bg-amber text-background px-4 py-2 rounded-sm font-bold hover:bg-amber/90 transition-colors disabled:opacity-40"
              >
                {savingPreview ? "Saving…" : generatingVisuals ? "Wait for visuals…" : "Looks good →"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* Chat panel */}
        <div className={`flex flex-col min-h-0 transition-all duration-500 ${phase === "clarifying" ? "flex-1" : "w-[420px] shrink-0 border-r border-border"}`}>
          <div className="flex-1 overflow-y-auto py-6 px-1 flex flex-col gap-5">
            {visibleMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%] ${msg.role === "user" ? "self-end" : "self-start"}`}
              >
                <span className={`font-mono text-xs ${msg.role === "user" ? "text-slate" : "text-amber"}`}>
                  {msg.role === "user" ? "you" : "claude"}
                </span>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-elevated border border-border rounded-sm px-3 py-2.5 text-foreground"
                    : "text-foreground"
                }`}>
                  {msg.content}
                </p>
              </motion.div>
            ))}

            {streamText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-start max-w-[85%]">
                <span className="font-mono text-xs text-amber block mb-1">claude</span>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {streamText}
                  <span className="inline-block w-0.5 h-3.5 bg-amber ml-0.5 animate-pulse align-middle" />
                </p>
              </motion.div>
            )}

            {streaming && !streamText && (
              <div className="self-start">
                <span className="font-mono text-xs text-amber block mb-1">claude</span>
                <div className="flex gap-1 py-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1 h-1 rounded-full bg-amber/60 animate-bounce"
                      style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border pt-4 shrink-0 flex flex-col gap-2">
            {/* URL row */}
            <AnimatePresence>
              {urlOpen && (
                <motion.form
                  onSubmit={handleScrape}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 items-center mb-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={e => { setUrlInput(e.target.value); setUrlError("") }}
                      placeholder="https://…"
                      autoFocus
                      disabled={scrapingUrl}
                      className="flex-1 bg-input border border-amber/20 rounded-sm px-3 py-2 font-mono text-xs text-foreground placeholder:text-slate/40 focus:outline-none focus:border-amber/40 transition-colors disabled:opacity-40"
                    />
                    <button type="submit" disabled={!urlInput.trim() || scrapingUrl}
                      className="font-mono text-xs border border-amber/30 text-amber px-3 py-2 rounded-sm hover:bg-amber/10 transition-colors disabled:opacity-30 shrink-0">
                      {scrapingUrl ? "…" : "fetch"}
                    </button>
                    <button type="button" onClick={() => { setUrlOpen(false); setUrlInput(""); setUrlError("") }}
                      className="font-mono text-xs text-slate/50 hover:text-slate transition-colors px-1">
                      ✕
                    </button>
                  </div>
                  {urlError && (
                    <p className="font-mono text-[10px] text-coral/80 mb-1">{urlError}</p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
                placeholder="Reply… (Enter to send)"
                rows={2}
                className="flex-1 bg-input border border-border rounded-sm px-3 py-2.5 text-sm text-foreground placeholder:text-slate focus:outline-none focus:border-amber/30 transition-colors font-mono resize-none"
              />
              <div className="flex flex-col gap-1.5 shrink-0">
                <button type="button" onClick={() => fileRef.current?.click()}
                  disabled={uploadingFile || streaming}
                  className="font-mono text-xs border border-border text-slate px-3 py-2.5 rounded-sm hover:text-foreground transition-colors disabled:opacity-40">
                  {uploadingFile ? "…" : "↑"}
                </button>
                <button type="button"
                  onClick={() => { setUrlOpen(v => !v); setUrlError("") }}
                  disabled={streaming}
                  className={`font-mono text-xs border px-3 py-2.5 rounded-sm transition-colors disabled:opacity-40 ${urlOpen ? "border-amber/40 text-amber bg-amber/8" : "border-border text-slate hover:text-foreground"}`}>
                  ↗
                </button>
                <button type="submit" disabled={!input.trim() || streaming}
                  className="font-mono text-xs bg-amber text-background px-3 py-2.5 rounded-sm font-bold hover:bg-amber/90 transition-colors disabled:opacity-40">
                  →
                </button>
              </div>
            </form>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md,image/*"
              className="hidden" onChange={handleUpload} />
          </div>
        </div>

        {/* Form panel */}
        <AnimatePresence>
          {phase === "form_review" && form && (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex-1 overflow-y-auto py-6 px-8 min-h-0"
            >
              <FormEditor form={form} onChange={setForm} revealedFields={revealedFields} sessionId={sessionId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Form Editor ────────────────────────────────────────────────────────────

function FormEditor({
  form, onChange, revealedFields, sessionId,
}: {
  form: Form
  onChange: (f: Form) => void
  revealedFields: Set<string>
  sessionId: string
}) {
  function patch(path: string[], value: unknown) {
    const next = JSON.parse(JSON.stringify(form)) as Form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cursor: any = next
    for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i]]
    cursor[path[path.length - 1]] = value
    onChange(next)
  }

  const hero     = form.segments?.hero
  const features = form.segments?.features?.features ?? []
  const steps    = form.segments?.how_it_works?.steps ?? []
  const stats    = form.segments?.stats?.stats ?? []
  const cta      = form.segments?.cta

  return (
    <div className="flex flex-col gap-10">
      <RevealSection label="Product" fieldKey="meta" revealed={revealedFields.has("meta")}>
        <Row label="Name">
          <Input value={form.name} onChange={v => onChange({ ...form, name: v })} />
        </Row>
        <Row label="Slug">
          <Input value={form.slug} onChange={v => onChange({ ...form, slug: v })} mono />
        </Row>
        <Row label="Tagline">
          <Input value={form.tagline} onChange={v => onChange({ ...form, tagline: v })} />
        </Row>
      </RevealSection>

      {hero && (
        <RevealSection label="Hero" fieldKey="hero.headline" revealed={revealedFields.has("hero.headline")}>
          <Row label="Headline">
            <Input value={hero.headline} onChange={v => patch(["segments", "hero", "headline"], v)} />
          </Row>
          <Row label="Subheadline">
            <Input value={hero.subheadline ?? ""} onChange={v => patch(["segments", "hero", "subheadline"], v)} />
          </Row>
          <Row label="Description">
            <Textarea value={hero.description} onChange={v => patch(["segments", "hero", "description"], v)} />
          </Row>
          <Row label="Tags">
            <Input
              value={(hero.tags ?? []).join(", ")}
              onChange={v => patch(["segments", "hero", "tags"], v.split(",").map((t: string) => t.trim()).filter(Boolean))}
              mono
            />
          </Row>
        </RevealSection>
      )}

      {features.length > 0 && (
        <RevealSection label="Features" fieldKey="features" revealed={revealedFields.has("features")}>
          {features.map((f, i) => (
            <div key={i} className="flex flex-col gap-2 pb-5 border-b border-border last:border-0">
              <Row label={`${String(i + 1).padStart(2, "0")} title`}>
                <Input value={f.title} onChange={v => { const n = [...features]; n[i] = { ...f, title: v }; patch(["segments", "features", "features"], n) }} />
              </Row>
              <Row label="description">
                <Textarea value={f.description} onChange={v => { const n = [...features]; n[i] = { ...f, description: v }; patch(["segments", "features", "features"], n) }} />
              </Row>
            </div>
          ))}
        </RevealSection>
      )}

      {steps.length > 0 && (
        <RevealSection label="How it works" fieldKey="how_it_works" revealed={revealedFields.has("how_it_works")}>
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 pb-5 border-b border-border last:border-0">
              <Row label={`Step ${String(i + 1).padStart(2, "0")}`}>
                <Input value={s.title} onChange={v => { const n = [...steps]; n[i] = { ...s, title: v }; patch(["segments", "how_it_works", "steps"], n) }} />
              </Row>
              <Row label="description">
                <Textarea value={s.description} onChange={v => { const n = [...steps]; n[i] = { ...s, description: v }; patch(["segments", "how_it_works", "steps"], n) }} />
              </Row>
            </div>
          ))}
        </RevealSection>
      )}

      {stats.length > 0 && (
        <RevealSection label="Stats" fieldKey="stats" revealed={revealedFields.has("stats")}>
          {stats.map((s, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 pb-4 border-b border-border last:border-0">
              <Row label="label">
                <Input value={s.label} onChange={v => { const n = [...stats]; n[i] = { ...s, label: v }; patch(["segments", "stats", "stats"], n) }} />
              </Row>
              <Row label="value">
                <Input value={s.value} onChange={v => { const n = [...stats]; n[i] = { ...s, value: v }; patch(["segments", "stats", "stats"], n) }} mono />
              </Row>
              <Row label="note">
                <Input value={s.note ?? ""} onChange={v => { const n = [...stats]; n[i] = { ...s, note: v }; patch(["segments", "stats", "stats"], n) }} />
              </Row>
            </div>
          ))}
        </RevealSection>
      )}

      {cta && (
        <RevealSection label="Call to action" fieldKey="cta" revealed={revealedFields.has("cta")}>
          <Row label="Headline">
            <Input value={cta.headline} onChange={v => patch(["segments", "cta", "headline"], v)} />
          </Row>
          <Row label="Description">
            <Textarea value={cta.description} onChange={v => patch(["segments", "cta", "description"], v)} />
          </Row>
          <Row label="Button">
            <Input value={cta.button_label} onChange={v => patch(["segments", "cta", "button_label"], v)} />
          </Row>
          <Row label="URL">
            <Input value={cta.button_url} onChange={v => patch(["segments", "cta", "button_url"], v)} mono />
          </Row>
        </RevealSection>
      )}

      {/* Flow builder section */}
      <RevealSection label="Interactive Flow" fieldKey="interactive_flow" revealed={revealedFields.has("interactive_flow")}>
        <FlowBuilder
          sessionId={sessionId}
          onSchema={(schema: FlowSchema) => {
            onChange({
              ...form,
              segments: {
                ...form.segments,
                interactive_flow: { schema },
              },
            })
          }}
        />
        {form.segments.interactive_flow && (
          <p className="font-mono text-[10px] text-amber/60">
            ✓ Flow animation ready — {form.segments.interactive_flow.schema.nodes.length} nodes
          </p>
        )}
      </RevealSection>
    </div>
  )
}

// ─── Primitives ─────────────────────────────────────────────────────────────

function RevealSection({
  label, fieldKey, revealed, children,
}: {
  label: string
  fieldKey: string
  revealed: boolean
  children: React.ReactNode
}) {
  void fieldKey
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-amber uppercase tracking-widest shrink-0">{label}</span>
        <div className="rule-amber flex-1" />
      </div>
      {children}
    </motion.div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-xs text-slate">{label}</span>
      {children}
    </div>
  )
}

function Input({ value, onChange, mono }: { value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber/30 transition-colors ${mono ? "font-mono" : ""}`}
    />
  )
}

function Textarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={3}
      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber/30 transition-colors resize-none"
    />
  )
}
