"use client"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import type { AIMessage } from "@/types"

type Phase = "clarifying" | "form_review" | "preview" | "approved"

interface Form {
  name: string
  slug: string
  tagline: string
  segments: Record<string, unknown>
}

interface Props {
  productId: string
  sessionId: string
  productName: string
  onComplete: () => void
}

export default function AIBuilder({ productId, sessionId, productName, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("clarifying")
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [form, setForm] = useState<Form | null>(null)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  // Kick off the session with an opening message from Claude
  useEffect(() => {
    sendMessage(`I want to create a product page for "${productName}". Please start by asking me what you need to know.`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendMessage(content: string) {
    if (streaming) return
    const userMessage: AIMessage = { role: "user", content, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setStreaming(true)
    setStreamingText("")

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: content }),
      })

      if (!res.body) throw new Error("No stream")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "))
        for (const line of lines) {
          const data = JSON.parse(line.slice(6))
          if (data.text) {
            accumulated += data.text
            setStreamingText(accumulated)
          }
          if (data.done) {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: accumulated,
              timestamp: new Date().toISOString(),
            }])
            setStreamingText("")
          }
        }
      }
    } catch {
      toast.error("Failed to send message")
    } finally {
      setStreaming(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Upload failed")
        return
      }
      const { extractedText, name } = await res.json()
      if (extractedText) {
        await sendMessage(`Here is the content of the document "${name}":\n\n${extractedText}`)
      } else {
        toast.success(`${name} uploaded (no text to extract)`)
      }
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploadingFile(false)
      if (fileRef.current) fileRef.current.value = ""
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
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to generate form")
        return
      }
      const { form: generatedForm } = await res.json()
      setForm(generatedForm)
      setPhase("form_review")
    } catch {
      toast.error("Failed to generate form")
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprove(targetStatus: "preview" | "published") {
    if (!form) return
    setPublishing(true)
    try {
      // Save segments
      const segmentOrder = ["hero", "preview", "features", "how_it_works", "stats", "testimonials", "cta"]
      const segments = segmentOrder
        .filter(type => form.segments[type])
        .map((type, i) => ({
          product_id: productId,
          type,
          content: form.segments[type],
          visible: true,
          order: i,
        }))

      const segRes = await fetch(`/api/products/${productId}/segments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments }),
      })
      if (!segRes.ok) throw new Error()

      // Update product metadata and status
      await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          tagline: form.tagline,
          status: targetStatus,
        }),
      })

      toast.success(targetStatus === "published" ? "Product published" : "Preview ready")
      onComplete()
    } catch {
      toast.error("Failed to save product")
    } finally {
      setPublishing(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || streaming) return
    sendMessage(input.trim())
  }

  const visibleMessages = messages.filter(m =>
    // Hide the initial system-trigger message from UI
    !(m.role === "user" && messages.indexOf(m) === 0)
  )

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border shrink-0">
        <div>
          <p className="font-mono text-xs text-amber uppercase tracking-widest mb-1">AI Builder</p>
          <h1 className="font-display text-2xl font-bold text-foreground">{productName}</h1>
        </div>
        <div className="flex items-center gap-3">
          {phase === "clarifying" && (
            <button
              onClick={handleGenerateForm}
              disabled={generating || streaming || messages.length < 3}
              className="font-mono text-xs border border-amber/30 text-amber rounded px-4 py-2 hover:bg-amber/10 transition-colors disabled:opacity-40"
            >
              {generating ? "Generating…" : "Ready — build form →"}
            </button>
          )}
          {phase === "form_review" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPhase("clarifying")}
                className="font-mono text-xs border border-border text-slate rounded px-4 py-2 hover:border-foreground/20 hover:text-foreground transition-colors"
              >
                ← Back to chat
              </button>
              <button
                onClick={() => setPhase("preview")}
                className="font-mono text-xs bg-amber text-background rounded px-4 py-2 hover:bg-amber/90 transition-colors font-bold"
              >
                Approve form →
              </button>
            </div>
          )}
          {phase === "preview" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPhase("form_review")}
                className="font-mono text-xs border border-border text-slate rounded px-4 py-2 hover:border-foreground/20 hover:text-foreground transition-colors"
              >
                ← Edit form
              </button>
              <button
                onClick={() => handleApprove("preview")}
                disabled={publishing}
                className="font-mono text-xs border border-amber/30 text-amber rounded px-4 py-2 hover:bg-amber/10 transition-colors disabled:opacity-40"
              >
                {publishing ? "…" : "Save as preview"}
              </button>
              <button
                onClick={() => handleApprove("published")}
                disabled={publishing}
                className="font-mono text-xs bg-amber text-background rounded px-4 py-2 hover:bg-amber/90 transition-colors font-bold disabled:opacity-40"
              >
                {publishing ? "Publishing…" : "Publish →"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Phase: Clarification chat */}
      {phase === "clarifying" && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-5">
            {visibleMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex flex-col gap-1 max-w-2xl ${msg.role === "user" ? "self-end items-end" : "self-start items-start"}`}
              >
                <span className="font-mono text-xs text-slate">
                  {msg.role === "user" ? "You" : "Claude"}
                </span>
                <div className={`px-4 py-3 rounded text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-elevated border border-border text-foreground"
                    : "text-foreground"
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {streamingText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="self-start max-w-2xl"
              >
                <span className="font-mono text-xs text-slate block mb-1">Claude</span>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {streamingText}
                  <span className="inline-block w-0.5 h-4 bg-amber ml-0.5 animate-pulse" />
                </p>
              </motion.div>
            )}

            {streaming && !streamingText && (
              <div className="self-start">
                <span className="font-mono text-xs text-slate block mb-1">Claude</span>
                <div className="flex gap-1.5 py-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1 h-1 rounded-full bg-amber animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border pt-4 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <div className="flex-1 flex flex-col gap-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                  placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="w-full bg-input border border-border rounded px-4 py-3 text-sm text-foreground placeholder:text-slate focus:outline-none focus:border-amber/40 transition-colors font-mono resize-none"
                />
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingFile || streaming}
                  className="font-mono text-xs border border-border text-slate rounded px-3 py-3 hover:border-foreground/20 hover:text-foreground transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {uploadingFile ? "Uploading…" : "↑ File"}
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || streaming}
                  className="bg-amber text-background font-mono font-bold text-xs rounded px-4 py-3 hover:bg-amber/90 transition-colors disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </form>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>
      )}

      {/* Phase: Form review */}
      {phase === "form_review" && form && (
        <div className="flex-1 overflow-y-auto py-6">
          <FormEditor form={form} onChange={setForm} />
        </div>
      )}

      {/* Phase: Preview */}
      {phase === "preview" && form && (
        <div className="flex-1 overflow-y-auto py-6">
          <div className="surface rounded-lg p-8">
            <p className="font-mono text-xs text-amber uppercase tracking-widest mb-4">Preview</p>
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">{form.name}</h2>
            <p className="text-sm text-slate mb-6">{form.tagline}</p>
            <div className="rule-amber w-12 mb-6" />
            <pre className="font-mono text-xs text-slate overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(form.segments, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline form editor
function FormEditor({ form, onChange }: { form: Form; onChange: (f: Form) => void }) {
  function update(path: string[], value: unknown) {
    const next = JSON.parse(JSON.stringify(form))
    let obj = next as Record<string, unknown>
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]] as Record<string, unknown>
    }
    obj[path[path.length - 1]] = value
    onChange(next)
  }

  const hero = form.segments?.hero as Record<string, unknown> | undefined
  const features = (form.segments?.features as { features: { title: string; description: string }[] } | undefined)?.features ?? []
  const steps = (form.segments?.how_it_works as { steps: { title: string; description: string }[] } | undefined)?.steps ?? []
  const stats = (form.segments?.stats as { stats: { label: string; value: string; note?: string }[] } | undefined)?.stats ?? []
  const cta = form.segments?.cta as Record<string, string> | undefined

  return (
    <div className="flex flex-col gap-10">
      {/* Core metadata */}
      <Section label="Product">
        <Field label="Name" value={form.name} onChange={v => onChange({ ...form, name: v })} />
        <Field label="Slug" value={form.slug} onChange={v => onChange({ ...form, slug: v })} mono />
        <Field label="Tagline" value={form.tagline} onChange={v => onChange({ ...form, tagline: v })} />
      </Section>

      {/* Hero */}
      {hero && (
        <Section label="Hero">
          <Field label="Headline" value={hero.headline as string} onChange={v => update(["segments", "hero", "headline"], v)} />
          <Field label="Subheadline" value={hero.subheadline as string ?? ""} onChange={v => update(["segments", "hero", "subheadline"], v)} />
          <Field label="Description" value={hero.description as string} onChange={v => update(["segments", "hero", "description"], v)} textarea />
          <Field label="Tags (comma separated)" value={(hero.tags as string[] ?? []).join(", ")} onChange={v => update(["segments", "hero", "tags"], v.split(",").map((t: string) => t.trim()).filter(Boolean))} />
        </Section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <Section label="Features">
          {features.map((f, i) => (
            <div key={i} className="flex flex-col gap-2 pb-4 border-b border-border last:border-0">
              <Field label={`Feature ${i + 1} — Title`} value={f.title} onChange={v => { const next = [...features]; next[i] = { ...f, title: v }; update(["segments", "features", "features"], next) }} />
              <Field label="Description" value={f.description} onChange={v => { const next = [...features]; next[i] = { ...f, description: v }; update(["segments", "features", "features"], next) }} textarea />
            </div>
          ))}
        </Section>
      )}

      {/* How it works */}
      {steps.length > 0 && (
        <Section label="How it works">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 pb-4 border-b border-border last:border-0">
              <Field label={`Step ${i + 1} — Title`} value={s.title} onChange={v => { const next = [...steps]; next[i] = { ...s, title: v }; update(["segments", "how_it_works", "steps"], next) }} />
              <Field label="Description" value={s.description} onChange={v => { const next = [...steps]; next[i] = { ...s, description: v }; update(["segments", "how_it_works", "steps"], next) }} textarea />
            </div>
          ))}
        </Section>
      )}

      {/* Stats */}
      {stats.length > 0 && (
        <Section label="Stats">
          {stats.map((s, i) => (
            <div key={i} className="flex gap-4 pb-4 border-b border-border last:border-0">
              <Field label="Label" value={s.label} onChange={v => { const next = [...stats]; next[i] = { ...s, label: v }; update(["segments", "stats", "stats"], next) }} />
              <Field label="Value" value={s.value} onChange={v => { const next = [...stats]; next[i] = { ...s, value: v }; update(["segments", "stats", "stats"], next) }} mono />
              <Field label="Note" value={s.note ?? ""} onChange={v => { const next = [...stats]; next[i] = { ...s, note: v }; update(["segments", "stats", "stats"], next) }} />
            </div>
          ))}
        </Section>
      )}

      {/* CTA */}
      {cta && (
        <Section label="Call to action">
          <Field label="Headline" value={cta.headline} onChange={v => update(["segments", "cta", "headline"], v)} />
          <Field label="Description" value={cta.description} onChange={v => update(["segments", "cta", "description"], v)} textarea />
          <Field label="Button label" value={cta.button_label} onChange={v => update(["segments", "cta", "button_label"], v)} />
          <Field label="Button URL" value={cta.button_url} onChange={v => update(["segments", "cta", "button_url"], v)} mono />
        </Section>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-amber uppercase tracking-widest shrink-0">{label}</span>
        <div className="rule-amber flex-1" />
      </div>
      {children}
    </div>
  )
}

function Field({
  label, value, onChange, textarea, mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  textarea?: boolean
  mono?: boolean
}) {
  const base = `w-full bg-input border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-slate focus:outline-none focus:border-amber/40 transition-colors ${mono ? "font-mono" : ""}`
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <label className="font-mono text-xs text-slate">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={`${base} resize-none`} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className={base} />
      )}
    </div>
  )
}
