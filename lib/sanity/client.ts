import { createClient } from 'next-sanity'

let _client: ReturnType<typeof createClient> | null = null

export function getSanityClient() {
  if (!_client) {
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ''
    // Sanity requires projectId to match /^[a-z0-9-]+$/ — skip creation if not configured
    if (!projectId || !/^[a-z0-9-]+$/.test(projectId)) {
      throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not configured')
    }
    _client = createClient({
      projectId,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
      apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01',
      useCdn: false,
      token: process.env.SANITY_API_TOKEN,
    })
  }
  return _client
}
