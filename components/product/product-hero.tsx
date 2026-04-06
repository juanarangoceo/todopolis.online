'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, Heart, ShoppingBag, Truck, Shield, RotateCcw } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckoutModal } from '@/components/checkout-modal';
import { useFavorites } from '@/app/providers/favorites-provider';

interface ProductHeroProps {
  product: Product;
}

export function ProductHero({ product }: ProductHeroProps) {
  const { favoriteSlugs, toggleFavorite } = useFavorites();
  const slug = (product as any).slug || (product as any)._id || '';
  const isWishlisted = favoriteSlugs.includes(slug);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const formatPrice = (price: number) => {
    return '$ ' + price.toLocaleString('es-CO');
  };

  // Support both images[] array (legacy mock) and single image (Sanity)
  const images: string[] = (product as any).images ?? (product.image ? [product.image] : ['/placeholder.jpg']);
  const heroTitle = (product as any).heroTitle ?? product.name;
  const heroCta = (product as any).heroCta ?? 'Agregar al carrito';

  return (
    <>
    <section className="relative py-4 md:py-8 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Image Gallery */}
          <div className="space-y-4">
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
            </div>

            {/* Thumbnails — only if multiple images */}
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

          {/* Product Info */}
          <div className="lg:sticky lg:top-24 space-y-6">
            {/* Category & Rating */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-primary uppercase tracking-wider">
                  {product.category}
                </span>
                {product.isBestSeller && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    Más Vendido
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-4 h-4",
                      i < Math.floor(product.rating ?? 0)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-muted text-muted"
                    )}
                  />
                ))}
                <span className="ml-2 text-sm font-medium">{product.rating ?? 5.0}</span>
                <span className="text-sm text-muted-foreground">
                  ({product.reviews?.length ?? 0} opiniones)
                </span>
              </div>
            </div>

            {/* Title (AI-generated heroTitle or product name) */}
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight text-balance">
              {heroTitle}
            </h1>

            {/* Subtitle */}
            {(product as any).heroSubtitle && (
              <p className="text-xl text-muted-foreground leading-relaxed">
                {(product as any).heroSubtitle}
              </p>
            )}

            {/* Short Description */}
            <p className="text-lg text-muted-foreground leading-relaxed">
              {product.shortDescription}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-4 py-4 border-y border-border/50">
              <span className="text-4xl font-bold text-foreground">
                {formatPrice(product.price ?? 0)}
              </span>
              {(product as any).originalPrice && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice((product as any).originalPrice)}
                  </span>
                </>
              )}
            </div>

            {/* In Stock indicator */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">En stock - Envío inmediato</span>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-300",
                  "bg-[#F43F5E] text-white hover:bg-[#E11D48] shadow-xl shadow-[#F43F5E]/30 hover:shadow-2xl hover:shadow-[#F43F5E]/40",
                  "hover:scale-[1.02] active:scale-[0.98] animate-[pulse_2s_ease-in-out_infinite]"
                )}
              >
                <ShoppingBag className="w-5 h-5" />
                {heroCta}
              </button>
              <button
                onClick={() => toggleFavorite(slug)}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all duration-300",
                  isWishlisted
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary"
                )}
                aria-label={isWishlisted ? "Quitar de favoritos" : "Agregar a favoritos"}
              >
                <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 pt-4 md:pt-6">
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
                <Truck className="w-6 h-6 text-[#F43F5E]" />
                <span className="text-[10px] md:text-xs text-center font-semibold text-foreground/80 leading-tight">Envío gratis +$150k</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
                <Shield className="w-6 h-6 text-[#10B981]" />
                <span className="text-[10px] md:text-xs text-center font-semibold text-foreground/80 leading-tight">Compra segura</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
                <RotateCcw className="w-6 h-6 text-[#3B82F6]" />
                <span className="text-[10px] md:text-xs text-center font-semibold text-foreground/80 leading-tight">30 días devolución</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        product={product} 
      />
    </section>

    {/* Sticky Mobile Checkout CTA — hidden when checkout modal is open */}
    {!isCheckoutOpen && (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <button
        onClick={() => setIsCheckoutOpen(true)}
        className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold text-lg bg-[#F43F5E] text-white shadow-2xl shadow-[#F43F5E]/40 active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 animate-pulse" />
          <span>{heroCta}</span>
        </div>
        <span className="text-white/90 font-medium whitespace-nowrap">
          {formatPrice(product.price ?? 0)}
        </span>
      </button>
    </div>
    )}
    </>
  );
}
