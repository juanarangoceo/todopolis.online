'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Zap } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { sanityCdnImage } from '@/lib/sanity/cdn-image';

// Las fotos de Sanity se piden ya redimensionadas a su CDN y NO pasan por el
// optimizador de Next: con PNG de 1-4 MB se colgaba (timeout de 7 s) y las
// miniaturas salían rotas, mostrando el texto alternativo. Las de Mastershop
// (cdn.bemaster.com) no tienen ese CDN y siguen por el optimizador.
const isSanity = (url: string) => url.includes('cdn.sanity.io');

interface ProductImageGalleryProps {
  product: Product;
}

// Galería de la columna izquierda en escritorio (la columna es `sticky`, la
// monta `app/producto/[slug]/page.tsx`).
//
// LAS MINIATURAS VAN DEBAJO, NO AL COSTADO. Antes eran una tira vertical a la
// izquierda de la imagen principal, y eso dejaba dos problemas a la vez:
//
//  1. La imagen principal perdía ~90 px de ancho para dar sitio a la tira, así
//     que el producto —lo único que el comprador quiere ver— salía más
//     pequeño de lo que cabía.
//  2. La columna pegajosa quedaba corta contra el embudo de la derecha, que es
//     larguísimo, y al deslizar se veía un hueco vacío bajo la foto durante
//     casi toda la página.
//
// Puestas debajo, la imagen ocupa el ancho completo de la columna y la tira
// baja el bloque hasta equilibrarlo con el texto de al lado. De paso es la
// misma disposición que ya tenía el móvil, así que la ficha se comporta igual
// en los dos tamaños.
export function ProductImageGallery({ product }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);

  const images: string[] = (product as any).images ?? (product.image ? [product.image] : ['/placeholder.jpg']);

  const discount = (product as any).originalPrice
    ? Math.round((1 - product.price / (product as any).originalPrice) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Imagen principal — ancho completo de la columna */}
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted/30 shadow-2xl shadow-primary/10">
        <Image
          src={sanityCdnImage(images[selectedImage], 1200)}
          alt={product.name}
          fill
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="object-cover"
          unoptimized={isSanity(images[selectedImage])}
          priority
          loading="eager"
        />
        {discount > 0 && (
          <span className="absolute top-4 left-4 px-3 py-1.5 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-1.5 bg-sale">
            <Zap className="w-3.5 h-3.5" />
            -{discount}%
          </span>
        )}
      </div>

      {/* Miniaturas — fila horizontal bajo la imagen.
          Se desplaza en horizontal si el producto trae muchas fotos: envolver
          en varias filas haría crecer la columna sin control y volvería a
          descuadrar el bloque contra el texto de la derecha. */}
      {images.length > 1 && (
        <div
          className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'thin' }}
        >
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              aria-label={`Ver imagen ${index + 1}`}
              aria-current={selectedImage === index}
              className={cn(
                'relative w-[4.5rem] h-[4.5rem] xl:w-20 xl:h-20 rounded-xl overflow-hidden ring-2 transition-all shrink-0 snap-start',
                selectedImage === index
                  ? 'ring-primary'
                  : 'ring-border/50 hover:ring-primary/50 opacity-70 hover:opacity-100'
              )}
            >
              <Image
                src={sanityCdnImage(image, 200)}
                alt={`${product.name} - Vista ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
                unoptimized={isSanity(image)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
