'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, Heart, ShoppingBag, Truck, Shield, RotateCcw, Zap } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckoutModal } from '@/components/checkout-modal';
import { useFavorites } from '@/app/providers/favorites-provider';
import { VariantSelector } from './variant-selector';
import { OfferCountdownInline } from './offer-countdown-inline';

interface ProductHeroProps {
  product: Product;
}

export function ProductHero({ product }: ProductHeroProps) {
  const { favoriteSlugs, toggleFavorite } = useFavorites();
  const slug = (product as any).slug || (product as any)._id || '';
  const isWishlisted = favoriteSlugs.includes(slug);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isExpandedDescription, setIsExpandedDescription] = useState(false);

  // Listen for buy event dispatched from the desktop image gallery banner
  useEffect(() => {
    const handler = () => setIsCheckoutOpen(true);
    window.addEventListener('product:buy', handler);
    return () => window.removeEventListener('product:buy', handler);
  }, []);

  const formatPrice = (price: number) => {
    return '$ ' + price.toLocaleString('es-CO');
  };

  const images: string[] = (product as any).images ?? (product.image ? [product.image] : ['/placeholder.jpg']);
  const heroTitle = (product as any).heroTitle ?? product.name;
  // Si el heroTitle persuasivo y el nombre real difieren, mostramos el nombre
  // como kicker arriba del título para que el cliente sepa qué producto es.
  const showProductKicker = !!product.name && heroTitle !== product.name;
  const rawHeroCta = (product as any).heroCta ?? 'Comprar ahora';
  // Guardrail: CTAs débiles ("Ver mi pedido", "Saber más", etc.) generados por
  // versiones viejas del prompt → forzar a un cierre fuerte.
  const heroCta = /^(ver|explor|descub|conoc|saber|m[áa]s\s+info)/i.test(rawHeroCta.trim())
    ? 'Comprar ahora'
    : rawHeroCta;
  
  const discount = (product as any).originalPrice
    ? Math.round((1 - product.price / (product as any).originalPrice) * 100)
    : 0;

  return (
    <>
    <section className="relative py-4 md:py-8 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Mobile-only: Image gallery inline */}
        <div className="lg:hidden space-y-4 mb-8">
          {/* Product name kicker (mobile, antes de la imagen) */}
          {showProductKicker && (
            <p className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-todopolis-pink-deep bg-todopolis-pink/30 px-2.5 py-1 rounded-full">
              {product.name}
            </p>
          )}

          {/* Main Image */}
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted/30 shadow-2xl shadow-primary/10">
            <Image
              src={images[selectedImage]}
              alt={product.name}
              fill
              sizes="100vw"
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

        {/* Product Info — full width, desktop version gets its own column from page layout */}
        <div className="space-y-6">
          {/* Title block */}
          <div className="space-y-2">
            {showProductKicker && (
              <p className="hidden lg:inline-block text-xs font-bold uppercase tracking-[0.18em] text-todopolis-pink-deep bg-todopolis-pink/30 px-2.5 py-1 rounded-full">
                {product.name}
              </p>
            )}
            <h1 className="font-serif text-xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              {heroTitle}
            </h1>
          </div>

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
                ({(product as any).reviewsCount ?? (product as any).testimonials?.length ?? product.reviews?.length ?? 15} reseñas)
              </span>
            </div>
          </div>

          {/* Subtitle */}
          {(product as any).heroSubtitle && (
            <p className="text-xl text-muted-foreground leading-relaxed">
              {(product as any).heroSubtitle}
            </p>
          )}

          {/* Short Description */}
          <div className="relative">
            <div className={cn(
              "text-lg text-muted-foreground leading-relaxed transition-all duration-300 overflow-hidden",
              !isExpandedDescription ? "line-clamp-3 sm:line-clamp-none max-h-24 sm:max-h-[2000px]" : "max-h-[2000px]"
            )}>
              <p>{product.shortDescription}</p>
            </div>
            <div className="sm:hidden mt-2 flex">
              <button
                onClick={() => setIsExpandedDescription(!isExpandedDescription)}
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                {isExpandedDescription ? 'Ver menos' : 'Ver más'}
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2 py-4 border-t border-border/50">
            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold text-foreground">
                {formatPrice(product.price ?? 0)}
              </span>
              {(product as any).originalPrice && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice((product as any).originalPrice)}
                </span>
              )}
            </div>
            {/* Countdown de oferta — texto compacto, justo bajo el precio */}
            {(product as any).offerName && (product as any).offerEndsAt && (
              <OfferCountdownInline
                offerName={(product as any).offerName}
                offerEndsAt={(product as any).offerEndsAt}
              />
            )}
          </div>

          {/* Contraentrega Badge — unificado al sistema de confianza */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-trust-bg border border-trust-border">
            <div className="w-9 h-9 shrink-0 rounded-full bg-surface flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-trust-fg" />
            </div>
            <div>
              <p className="font-bold text-sm text-trust-fg leading-tight">Pago Contraentrega</p>
              <p className="text-xs text-trust-fg/75 leading-tight mt-0.5">Solo pagas cuando el pedido llegue a tu puerta</p>
            </div>
          </div>

          {/* In Stock */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">En stock - Envío inmediato</span>
          </div>

          {/* Variant Selector — solo aparece si el producto tiene variantes */}
          <VariantSelector />

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-300",
                "bg-cta text-cta-fg hover:bg-cta-hover shadow-xl shadow-cta-ring hover:shadow-2xl",
                "hover:scale-[1.02] active:scale-[0.98]"
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
                  ? "border-accent-feminine bg-accent-feminine/20 text-todopolis-pink-deep"
                  : "border-border hover:border-accent-feminine/50 text-muted-foreground hover:text-todopolis-pink-deep"
              )}
              aria-label={isWishlisted ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
            </button>
          </div>

          {/* Trust Badges — sistema único de confianza */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 pt-4 md:pt-6">
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-trust-bg border border-trust-border">
              <Truck className="w-6 h-6 text-trust-fg" />
              <span className="text-[10px] md:text-xs text-center font-semibold text-foreground/80 leading-tight">Envío a todo Colombia</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-trust-bg border border-trust-border">
              <Shield className="w-6 h-6 text-trust-fg" />
              <span className="text-[10px] md:text-xs text-center font-semibold text-foreground/80 leading-tight">Compra segura</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-trust-bg border border-trust-border">
              <RotateCcw className="w-6 h-6 text-trust-fg" />
              <span className="text-[10px] md:text-xs text-center font-semibold text-foreground/80 leading-tight">30 días devolución</span>
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

    {/* Sticky Mobile Checkout CTA */}
    {!isCheckoutOpen && (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <button
        onClick={() => setIsCheckoutOpen(true)}
        className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold text-lg bg-cta text-cta-fg shadow-2xl shadow-cta-ring active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          <span>{heroCta}</span>
        </div>
        <span className="text-cta-fg/80 font-medium whitespace-nowrap">
          {formatPrice(product.price ?? 0)}
        </span>
      </button>
    </div>
    )}
    </>
  );
}
