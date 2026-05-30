'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Zap } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductImageGalleryProps {
  product: Product;
}

export function ProductImageGallery({ product }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);

  const images: string[] = (product as any).images ?? (product.image ? [product.image] : ['/placeholder.jpg']);
  
  const discount = (product as any).originalPrice
    ? Math.round((1 - product.price / (product as any).originalPrice) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Gallery body — thumbnails vertical a la izquierda, imagen principal
          a la derecha. Cuando hay una sola imagen, los thumbnails no se
          renderizan y la imagen ocupa todo el ancho. */}
      <div className={cn("flex gap-3", images.length > 1 ? "items-start" : "")}>
        {/* Thumbnails (vertical) */}
        {images.length > 1 && (
          <div className="flex flex-col gap-2.5 shrink-0 max-h-[520px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={cn(
                  "relative w-16 h-16 xl:w-20 xl:h-20 rounded-xl overflow-hidden ring-2 transition-all shrink-0",
                  selectedImage === index ? "ring-primary" : "ring-border/50 hover:ring-primary/50 opacity-70 hover:opacity-100"
                )}
                aria-label={`Ver imagen ${index + 1}`}
              >
                <Image
                  src={image}
                  alt={`${product.name} - Vista ${index + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main Image */}
        <div className="relative flex-1 aspect-square rounded-3xl overflow-hidden bg-muted/30 shadow-2xl shadow-primary/10">
          <Image
            src={images[selectedImage]}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover"
            priority
          />
          {discount > 0 && (
            <span className="absolute top-4 left-4 px-3 py-1.5 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-1.5 bg-sale">
              <Zap className="w-3.5 h-3.5" />
              -{discount}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
