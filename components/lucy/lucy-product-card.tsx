'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Star } from 'lucide-react';

interface Product {
  id: string;
  slug: string;
  name: string;
  short_description?: string;
  price: number;
  image_url?: string;
  category?: string;
  is_new?: boolean;
  is_best_seller?: boolean;
}

interface LucyProductCardProps {
  product: Product;
}

export function LucyProductCard({ product }: LucyProductCardProps) {
  const formattedPrice = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(product.price);

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-[#EDD2F3]/40 bg-white shadow-md hover:shadow-lg transition-shadow">
      {/* Product Image */}
      {product.image_url && (
        <div className="relative w-full h-36 bg-gradient-to-br from-[#FFF0F5] to-[#F5F0FF]">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="280px"
          />
          {product.is_new && (
            <span className="absolute top-2 left-2 text-[10px] font-bold bg-[#FFB4AC] text-white px-2 py-0.5 rounded-full">
              NUEVO
            </span>
          )}
          {product.is_best_seller && (
            <span className="absolute top-2 right-2 text-[10px] font-bold bg-[#EDD2F3] text-[#9B59B6] px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current" /> TOP
            </span>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="p-3">
        <p className="font-bold text-foreground text-sm leading-tight mb-0.5 line-clamp-2">
          {product.name}
        </p>
        {product.short_description && (
          <p className="text-[11px] text-foreground/60 line-clamp-2 mb-2">
            {product.short_description}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#F43F5E] font-black text-base">{formattedPrice}</span>
          <Link
            href={`/producto/${product.slug}`}
            className="flex items-center gap-1 text-[11px] font-bold text-white bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity shrink-0"
          >
            <ShoppingBag className="w-3 h-3" />
            Ver producto
          </Link>
        </div>
      </div>
    </div>
  );
}
