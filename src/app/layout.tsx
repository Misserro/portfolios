import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "sfer — Product Portfolio",
  description: "A showcase of products built by sfer.co",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
