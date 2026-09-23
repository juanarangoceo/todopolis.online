import { NextRequest, NextResponse } from 'next/server'
import { experimental_evaluate as evaluate } from 'ai'
import { fetchTagTaxonomy } from '@/lib/auto-tag'
import { JEV_MODEL, jevConfigured } from '@/lib/jev'
import { buildSuggestRequest, normalizeSuggestQuery, parseSuggestAnswers, type SearchSuggestion } from '@/lib/search-suggest'

// Sugerencias para una búsqueda del home SIN resultados (lib/search-suggest.ts).
//
// Es pública —la llama el navegador— y cada llamada cuesta una evaluación de
// JEV, así que se protege de tres formas: el cliente solo la llama con cero
// resultados, la búsqueda se normaliza y recorta (60 caracteres), y la
// respuesta se cachea en la CDN por búsqueda durante una semana. Diez personas
// que buscan «cafetera» pagan una sola llamada.
//
// Nunca falla hacia el comprador: sin JEV, o si JEV no responde, devuelve una
// sugerencia vacía y la página muestra su estado vacío de siempre.

const EMPTY: SearchSuggestion = { category: null, tags: [] }
const CACHE_OK = 'public, s-maxage=604800, stale-while-revalidate=86400'
// Un fallo no se cachea largo: JEV puede volver en un minuto.
const CACHE_FAIL = 'public, s-maxage=60'

export async function GET(request: NextRequest) {
  const q = normalizeSuggestQuery(request.nextUrl.searchParams.get('q'))
  if (!q || !jevConfigured()) {
    return NextResponse.json(EMPTY, { headers: { 'Cache-Control': CACHE_FAIL } })
  }

  try {
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const token = process.env.SANITY_API_TOKEN
    if (!projectId || !token) return NextResponse.json(EMPTY, { headers: { 'Cache-Control': CACHE_FAIL } })
    const tags = await fetchTagTaxonomy({
      projectId,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
      apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01',
      token,
    })

    const { keyToSlug, state, questions } = buildSuggestRequest(q, tags)
    const result = await evaluate({
      model: JEV_MODEL,
      state,
      questions,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(9000),
      providerOptions: { gateway: { zeroDataRetention: true } },
    })
    const confidence = (result.providerMetadata?.typesafe?.confidence as Record<string, unknown> | undefined)?.category
    const suggestion = parseSuggestAnswers(
      result.answers as Parameters<typeof parseSuggestAnswers>[0],
      keyToSlug,
      tags,
      typeof confidence === 'number' ? confidence : null,
    )
    return NextResponse.json(suggestion, { headers: { 'Cache-Control': CACHE_OK } })
  } catch (err) {
    console.warn('[search-suggest] JEV no respondió:', (err as Error)?.message ?? err)
    return NextResponse.json(EMPTY, { headers: { 'Cache-Control': CACHE_FAIL } })
  }
}
