import { MetadataRoute } from 'next'
import { getAllProductSlugs, getAllArticleSlugs } from '@/lib/sanity/queries'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/ofertas`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/favoritos`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.5,
  },
  {
    url: `${BASE_URL}/blog`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  },
]

export const revalidate = 3600 // re-generate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productSlugs, articleSlugs] = await Promise.all([
    getAllProductSlugs().catch(() => []),
    getAllArticleSlugs().catch(() => []),
  ])

  const productRoutes: MetadataRoute.Sitemap = productSlugs
    .filter(({ category }: { category?: string }) => category !== 'bienestar-intimo')
    .map(({ slug }: { slug: string }) => ({
      url: `${BASE_URL}/producto/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

  const articleRoutes: MetadataRoute.Sitemap = articleSlugs.map(({ slug }) => ({
    url: `${BASE_URL}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...STATIC_ROUTES, ...productRoutes, ...articleRoutes]
}
