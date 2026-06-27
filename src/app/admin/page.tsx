import { query } from "@/lib/db"
import type { Product } from "@/types"
import ProductTable from "@/components/admin/ProductTable"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminDashboard() {
  const products = await query<Product>(
    `SELECT * FROM products ORDER BY "order" ASC`
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between border-b border-border pb-8">
        <div>
          <span className="font-mono text-xs text-slate uppercase tracking-widest block mb-2">
            {products.length} {products.length === 1 ? "product" : "products"}
          </span>
          <h1 className="font-display text-4xl font-extrabold text-foreground leading-none">
            Products
          </h1>
        </div>
        <Link
          href="/admin/new"
          className="font-mono text-xs bg-amber text-background px-4 py-2.5 rounded-sm font-bold hover:bg-amber/90 transition-colors"
        >
          + New product
        </Link>
      </div>

      <ProductTable initialProducts={products} />
    </div>
  )
}
