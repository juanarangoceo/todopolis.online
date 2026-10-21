// Stock y costo del proveedor (Mastershop o Dropi) dentro de Sanity.
//
// Hasta oct-2026 el producto de Mastershop se quedaba con el costo y el stock
// del día del import: el 21-oct-2026, de 402 publicados, 54 ya no existían en
// Mastershop (404) y 32 tenían stock 0, y la tienda los seguía vendiendo.
// La sincronización horaria (lib/mastershop-sync.ts, /api/cron/dropi-sync)
// los mantiene al día y esto decide qué se puede vender.

export interface SupplierStockFields {
  dropiId?: number | null
  dropiStock?: number | null
  mastershopId?: number | null
  mastershopStock?: number | null
  mastershopAvailable?: boolean | null
}

/**
 * Agotado en el proveedor: no se puede comprar. Sin dato (producto viejo que
 * aún no pasó por la sincronización) NO es agotado: en duda se vende, como
 * siempre se hizo.
 */
export function isSoldOut(p: SupplierStockFields | null | undefined): boolean {
  if (!p) return false
  if (typeof p.dropiId === 'number' && typeof p.dropiStock === 'number' && p.dropiStock <= 0) return true
  if (typeof p.mastershopId === 'number') {
    if (p.mastershopAvailable === false) return true
    if (typeof p.mastershopStock === 'number' && p.mastershopStock <= 0) return true
  }
  return false
}

export interface StoredVariant {
  _key?: string
  _type?: string
  idVariant?: number
  name?: string
  sku?: string
  price?: number
  stock?: number
  isEnable?: boolean
}

/**
 * Actualiza costo, stock y si está activa cada variante guardada con lo que
 * dice el proveedor ahora. Conserva nombre y `_key` (el Studio las sigue por
 * ahí), añade las nuevas y apaga con stock 0 las que el proveedor retiró.
 */
export function mergeVariants(stored: StoredVariant[], fresh: StoredVariant[]): StoredVariant[] {
  const byId = new Map(fresh.filter((v) => typeof v.idVariant === 'number').map((v) => [v.idVariant, v]))
  const merged = stored.map((old) => {
    const now = byId.get(old.idVariant)
    if (!now) return { ...old, stock: 0, isEnable: false }
    byId.delete(old.idVariant)
    return { ...old, price: now.price ?? old.price, stock: now.stock ?? old.stock, isEnable: now.isEnable ?? old.isEnable }
  })
  return [...merged, ...byId.values()]
}

/** Solo los campos que cambiaron; `null` si no hay nada que escribir. */
export function changedFields(current: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> | null {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(next)) {
    if (JSON.stringify(current[k] ?? null) !== JSON.stringify(v ?? null)) out[k] = v
  }
  return Object.keys(out).length ? out : null
}

/** Lo que guarda el import de Mastershop desde el primer día; la sincronización lo mantiene. */
export function mastershopStockFields(p: { stockTotal?: unknown }, cost: number) {
  return {
    mastershopCost: cost > 0 ? cost : null,
    mastershopStock: typeof p.stockTotal === 'number' ? p.stockTotal : null,
    mastershopAvailable: true,
    mastershopSyncedAt: new Date().toISOString(),
  }
}
