import Image from 'next/image'

interface ProductLifestyleImageProps {
  product: {
    name: string
    aiLifestyleImage?: string
  }
}

export function ProductLifestyleImage({ product }: ProductLifestyleImageProps) {
  if (!product.aiLifestyleImage) return null

  return (
    <section className="py-8 md:py-12 overflow-hidden">
      <div className="relative mx-auto max-w-sm md:max-w-md">
        <div
          aria-hidden
          className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#FFD5E5]/60 via-[#FFF0F5]/40 to-[#f8b4d9]/30 blur-2xl"
        />
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src={product.aiLifestyleImage}
            alt={`${product.name} — lifestyle`}
            width={1024}
            height={1536}
            className="w-full h-auto object-cover"
            priority={false}
            unoptimized
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      </div>
    </section>
  )
}
