import type { SanityClient } from 'sanity'

/**
 * Devuelve el id del BORRADOR sobre el que deben escribir los botones del
 * Studio, creándolo a partir del publicado si hace falta.
 *
 * Existe porque `useFormValue(['_id'])` devuelve el id PUBLICADO cuando estás
 * viendo un producto ya publicado. Parchear ese id tiene dos efectos malos:
 * el cambio sale a producción sin pasar por "Publish", y si había un borrador
 * abierto, al publicarlo se pisa lo que acabas de escribir con la versión vieja
 * del borrador (fue lo que hacía desaparecer fotos recién subidas).
 *
 * Lanza error si no existe ni borrador ni publicado — documento nuevo sin
 * guardar, donde no hay nada que parchear todavía.
 */
export async function ensureDraftId(client: SanityClient, docId: string): Promise<string> {
  if (docId.startsWith('drafts.')) return docId

  const draftId = `drafts.${docId}`

  const existingDraft = await client.getDocument(draftId)
  if (existingDraft) return draftId

  const publishedDoc = await client.getDocument(docId)
  if (publishedDoc) {
    await client.createIfNotExists({ ...publishedDoc, _id: draftId })
    return draftId
  }

  throw new Error(
    'El documento todavía no existe en el servidor. Escribe el nombre y espera a que el Studio guarde el borrador.',
  )
}
