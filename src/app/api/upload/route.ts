import { NextRequest, NextResponse } from "next/server"
import Anthropic, { toFile } from "@anthropic-ai/sdk"
import { auth } from "@/lib/auth"
import { uploadFile } from "@/lib/r2"

export const runtime = "nodejs"
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ALLOWED_TYPES: Record<string, "document" | "image" | "video" | "text"> = {
  "application/pdf": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "text/plain": "text",
  "text/markdown": "text",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/webm": "video",
}

// Files we send to Anthropic Files API (Claude can read these natively)
const ANTHROPIC_FILE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

const MAX_SIZE = 32 * 1024 * 1024 // 32MB — Anthropic Files API limit

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const fileKind = ALLOWED_TYPES[file.type]
  if (!fileKind) {
    return NextResponse.json(
      { error: `File type not supported. Accepted: PDF, DOCX, TXT, MD, images, MP4, WebM` },
      { status: 415 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File exceeds 32 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB received)` },
      { status: 413 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload to R2 for storage (videos, images that will be displayed)
  let storageUrl: string | null = null
  if (fileKind === "video" || fileKind === "image") {
    storageUrl = await uploadFile(buffer, file.name, file.type)
  }

  // Upload to Anthropic Files API so Claude can read the document natively
  // This handles large PDFs and DOCX without text extraction limits
  let anthropicFileId: string | null = null
  if (ANTHROPIC_FILE_TYPES.has(file.type)) {
    const uploaded = await anthropic.beta.files.upload({
      file: await toFile(buffer, file.name, { type: file.type }),
    })
    anthropicFileId = uploaded.id
  }

  // For plain text, extract directly — no Files API needed
  let extractedText: string | null = null
  if (fileKind === "text") {
    extractedText = buffer.toString("utf-8")
  }

  return NextResponse.json({
    anthropicFileId,
    storageUrl,
    extractedText,
    name: file.name,
    type: file.type,
    kind: fileKind,
    size: file.size,
  })
}
