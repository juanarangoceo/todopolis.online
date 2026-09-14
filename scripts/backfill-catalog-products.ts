import { projectSanityProduct, SANITY_CATALOG_PRODUCT_PROJECTION } from '../lib/catalog/project-sanity-product'
import { saveCatalogProduct } from '../lib/catalog/repository'
import { getSanityClient } from '../lib/sanity/client'

try {
  process.loadEnvFile('.env.local')
} catch {
  // CI y ejecuciones con variables exportadas no necesitan un archivo local.
}

async function main() {
  const apply = process.argv.includes('--apply')
  const documents = await getSanityClient().fetch(
    `*[_type == "product" && !(_id in path("drafts.**"))] | order(_id asc) ${SANITY_CATALOG_PRODUCT_PROJECTION}`
  ) as Array<Record<string, unknown>>
  const products = documents.map(projectSanityProduct).filter((product) => product !== null)

  if (!apply) {
    console.log(JSON.stringify({ dryRun: true, sanityDocuments: documents.length, validProducts: products.length }))
    return
  }

  let changed = 0
  for (const product of products) {
    const result = await saveCatalogProduct(product)
    if (result.changed) changed += 1
  }
  console.log(JSON.stringify({ dryRun: false, validProducts: products.length, changed }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
