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
      {/* Sale Banner — only for discounted products */}
      {discount > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#F43F5E] via-[#FF6B6B] to-[#F43F5E] p-3 md:p-4 shadow-lg shadow-[#F43F5E]/30">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-black text-sm md:text-base uppercase tracking-wider">
                  Oferta -{discount}%
                </p>
                <p className="text-white/80 text-xs font-medium">
                  ¡Por tiempo limitado!
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs font-medium">Ahorras</p>
              <p className="text-white font-black text-lg md:text-xl">
                {formatPrice(savings)}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Image */}
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted/30 shadow-2xl shadow-primary/10">
        <Image
          src={images[selectedImage]}
          alt={product.name}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        {discount > 0 && (
          <span className="absolute top-4 left-4 px-3 py-1.5 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-1.5 bg-[#F43F5E]">
            <Zap className="w-3.5 h-3.5" />
            -{discount}%
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 justify-center">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={cn(
                "relative w-20 h-20 rounded-xl overflow-hidden ring-2 transition-all",
                selectedImage === index ? "ring-primary" : "ring-border/50 hover:ring-primary/50 opacity-70 hover:opacity-100"
              )}
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
    </div>
  );
}
