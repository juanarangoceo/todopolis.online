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
  const savings = (product as any).originalPrice 
    ? (product as any).originalPrice - product.price 
    : 0;

  const formatPrice = (price: number) => {
    return '$ ' + price.toLocaleString('es-CO');
  };

  return (
    <div className="space-y-4">
      {/* Sale Banner — gradiente sale → coral-deep (paleta de marca, alta jerarquía) */}
      {discount > 0 && (
        <div
          className="relative overflow-hidden rounded-2xl p-3.5 md:p-4 shadow-md"
          style={{
            background:
              'linear-gradient(110deg, var(--sale) 0%, var(--sale) 45%, var(--todopolis-coral-deep) 100%)',
          }}
        >
          {/* Blobs decorativos para profundidad */}
          <div aria-hidden className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div aria-hidden className="absolute -bottom-10 left-1/3 w-32 h-32 bg-white/8 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-white font-black text-sm md:text-base uppercase tracking-wider drop-shadow-sm">
                  −{discount}% en oferta
                </p>
                <p className="text-white/85 text-[11px] md:text-xs font-medium">
                  Por tiempo limitado
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="text-right shrink-0 leading-tight">
                <p className="text-white/75 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Ahorras</p>
                <p className="text-white font-black text-lg md:text-xl tabular-nums drop-shadow-sm">
                  {formatPrice(savings)}
                </p>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('product:buy'))}
                className="shrink-0 px-3.5 py-2 bg-white text-todopolis-coral-deep text-xs font-black rounded-xl hover:bg-white/95 hover:scale-[1.03] active:scale-95 transition-all shadow-md whitespace-nowrap uppercase tracking-wider"
              >
                Comprar ya
              </button>
            </div>
          </div>
        </div>
      )}
      
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
