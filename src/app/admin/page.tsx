import { query } from "@/lib/db"
import type { Product } from "@/types"
import ProductTable from "@/components/admin/ProductTable"

export const dynamic = "force-dynamic"

export default async function AdminDashboard() {
  const products = await query<Product>(
    `SELECT * FROM products ORDER BY "order" ASC`
  )

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs text-amber uppercase tracking-widest mb-2">Dashboard</p>
          <h1 className="font-display text-3xl font-bold text-foreground">Products</h1>
        </div>
        <a
          href="/admin/new"
          className="flex items-center gap-2 bg-amber text-background font-display font-bold text-sm px-5 py-2.5 rounded hover:bg-amber/90 transition-colors"
        >
          <span>+</span>
          <span>Add product</span>
        </a>
      </div>

      <div className="rule-amber w-full" />

      <ProductTable initialProducts={products} />
    </div>
  )
}
