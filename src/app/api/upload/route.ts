import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadFile } from "@/lib/r2"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const maxSize = 20 * 1024 * 1024 // 20MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 413 })
  }

  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
  ]

  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "File type not supported" }, { status: 415 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const url = await uploadFile(buffer, file.name, file.type)

  let extractedText: string | null = null

  if (file.type === "application/pdf") {
    const pdfModule = await import("pdf-parse")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parse = (pdfModule as any).default ?? pdfModule
    const data = await parse(buffer)
    extractedText = data.text
  } else if (file.type.includes("wordprocessingml")) {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    extractedText = result.value
  } else if (file.type.startsWith("text/")) {
    extractedText = buffer.toString("utf-8")
  }

  return NextResponse.json({ url, extractedText, name: file.name, type: file.type })
}
