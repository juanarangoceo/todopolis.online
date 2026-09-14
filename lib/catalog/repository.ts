import type { CanonicalCatalogProduct } from './canonical-types'
import { createAdminClient } from '@/lib/supabase/admin'

export type CatalogMutationResult = {
  changed: boolean
  reason?: 'stale' | 'unchanged' | 'missing'
  event_id?: string
  event_type?: string
  source_version?: number
}

export async function saveCatalogProduct(product: CanonicalCatalogProduct): Promise<CatalogMutationResult> {
  const { data, error } = await createAdminClient().rpc('upsert_catalog_product', {
    p_product: product,
  })
  if (error) throw new Error(`No se pudo proyectar el producto: ${error.message}`)
  return data as CatalogMutationResult
}

export async function archiveCatalogProduct(params: {
  externalId: string
  sourceUpdatedAt: string
  contentHash: string
}): Promise<CatalogMutationResult> {
  const { data, error } = await createAdminClient().rpc('archive_catalog_product', {
    p_external_id: params.externalId,
    p_source_updated_at: params.sourceUpdatedAt,
    p_content_hash: params.contentHash,
  })
  if (error) throw new Error(`No se pudo archivar el producto: ${error.message}`)
  return data as CatalogMutationResult
}
