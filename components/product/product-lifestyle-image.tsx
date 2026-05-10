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
        {/* Decorative background blob */}
        <div
          aria-hidden
          className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#FFD5E5]/60 via-[#FFF0F5]/40 to-[#f8b4d9]/30 blur-2xl"
        />

        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src={product.aiLifestyleImage}
            alt={`${product.name} — imagen lifestyle`}
            width={1024}
            height={1280}
            className="w-full h-auto object-cover"
            priority={false}
          />

          {/* Subtle gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />

          {/* AI badge */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-lg">
            <span className="text-xs font-semibold text-gray-700">✨ Imagen IA</span>
          </div>
        </div>
      </div>
    </section>
  )
}
