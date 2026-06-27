import Link from "next/link"
import AdminNav from "@/components/admin/AdminNav"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AdminNav />
      <main className="flex-1 px-8 py-10 max-w-5xl w-full mx-auto">
        {children}
      </main>
    </div>
  )
}
