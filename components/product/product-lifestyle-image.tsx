import Image from 'next/image'

interface ProductLifestyleImageProps {
  product: {
    name: string
    aiLifestyleImage?: string
  }
}

// Pre-redimensionar en Sanity para no pasar un PNG 2MB al optimizador
// (timeout local). Sirve un JPEG ~800px que Next ya puede tocar sin riesgo.
function resizedFromSanity(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}w=${width}&q=75&auto=format`
}

export function ProductLifestyleImage({ product }: ProductLifestyleImageProps) {
  if (!product.aiLifestyleImage) return null

  const src = resizedFromSanity(product.aiLifestyleImage, 900)

  return (
    <section className="py-8 md:py-12 overflow-hidden">
      <div className="relative mx-auto max-w-sm md:max-w-md">
        <div
          aria-hidden
          className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#FFD5E5]/60 via-[#FFF0F5]/40 to-[#f8b4d9]/30 blur-2xl"
        />
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src={src}
            alt={`${product.name} — lifestyle`}
            width={900}
            height={1350}
            sizes="(max-width: 768px) 90vw, 448px"
            className="w-full h-auto object-cover"
            loading="lazy"
            unoptimized
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      </div>
    </section>
  )
}
