import { sha256Json } from './content-hash'
import { projectSanityProduct, SANITY_CATALOG_PRODUCT_PROJECTION } from './project-sanity-product'
import { archiveCatalogProduct, saveCatalogProduct, type CatalogMutationResult } from './repository'
import { getSanityClient } from '@/lib/sanity/client'

export async function syncSanityCatalogProduct(params: {
  externalId: string
  sourceUpdatedAt?: string | null
}): Promise<CatalogMutationResult> {
  const externalId = params.externalId.replace(/^drafts\./, '')
  const document = await getSanityClient().fetch(
    `*[_type == "product" && _id == $id][0]${SANITY_CATALOG_PRODUCT_PROJECTION}`,
    { id: externalId }
  )
  const product = document ? projectSanityProduct(document) : null
  const sourceUpdatedAt = document?._updatedAt ?? params.sourceUpdatedAt ?? new Date().toISOString()

  if (product) return saveCatalogProduct(product)

  return archiveCatalogProduct({
    externalId,
    sourceUpdatedAt,
    contentHash: sha256Json({ external_id: externalId, status: 'archived', source_updated_at: sourceUpdatedAt }),
  })
}
