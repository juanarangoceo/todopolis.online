'use client';

import { useState, useEffect } from 'react';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import Image from 'next/image';
import { Star, Heart, ShoppingBag, Truck, ShieldCheck, RotateCcw, Zap, Check } from 'lucide-react';
import { PaymentMethods } from '@/components/payment-methods';
import { sanitizeHeroCta } from '@/lib/cta';
import { descriptionBullets } from '@/lib/description';
import { priceForQuantity, savingsForQuantity, validOffers } from '@/lib/quantity-offers';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckoutModal } from '@/components/checkout-modal';
import { useFavorites } from '@/app/providers/favorites-provider';
import { VariantSelector } from './variant-selector';
import { OfferCountdownInline } from './offer-countdown-inline';
import { sanityCdnImage } from '@/lib/sanity/cdn-image';

interface ProductHeroProps {
  product: Product;
  /** wa.me ya armado. En móvil va dentro de la barra fija de compra. */
  whatsappHref?: string | null;
}

export function ProductHero({ product, whatsappHref }: ProductHeroProps) {
  const { favoriteSlugs, toggleFavorite } = useFavorites();
  const slug = (product as any).slug || (product as any)._id || '';
  const isWishlisted = favoriteSlugs.includes(slug);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  // Cantidad elegida en el selector de combos. El checkout abre con ella.
  const [selectedQty, setSelectedQty] = useState(1);

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
  // En un Destacado con titular de campaña, esa frase —la del anuncio— toma
  // el lugar del gancho de la IA: quien llega del anuncio reconoce lo que vio.
  const campaignHeadline = product.isDestacado ? (product as any).destacadoHeadline?.trim() : '';
  const heroTitle = campaignHeadline || ((product as any).heroTitle ?? product.name);
  // El gancho solo se pinta si aporta algo: `heroTitle` cae a `product.name`
  // cuando el producto no tiene copy de IA, y en ese caso repetir el nombre
  // debajo del titular parece un fallo de plantilla.
  const hasHook = !!heroTitle && heroTitle !== product.name;
  // El CTA del producto pasa por `sanitizeHeroCta` (lib/cta.ts): descarta los
  // verbos de exploración, le arranca la mención a la contraentrega —que dejó
  // de ser el único medio de pago— y sustituye los que no caben en una línea.
  const heroCta = sanitizeHeroCta((product as any).heroCta);
  
  const discount = (product as any).originalPrice
    ? Math.round((1 - product.price / (product as any).originalPrice) * 100)
    : 0;

  // Combos por cantidad, sobre el precio de venta. (El `price` de la variante
  // es el costo de Mastershop, no un precio de venta: no se usa.)
  const offers = validOffers(product.price ?? 0, product.quantityOffers);
  const qty = offers.length ? selectedQty : 1;
  const selectedTotal = priceForQuantity(product.price ?? 0, qty, offers);

  const bullets = descriptionBullets(product.shortDescription);

  return (
    <>
    <section className="relative py-4 md:py-8 overflow-hidden">
      {/* Sin fondo decorativo. Había un degradado del color del botón (rojo al
          5%) en la mitad derecha que en escritorio se cortaba en seco al borde
          de la columna y dejaba un recuadro rosado sin motivo. */}

      <div className="container mx-auto px-4">
        {/* Mobile-only: Image gallery inline */}
        <div className="lg:hidden space-y-4 mb-8">
          {/* Main Image */}
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted/30 shadow-2xl shadow-primary/10">
            <Image
              src={sanityCdnImage(images[selectedImage], 900)}
              alt={product.name}
              fill
              sizes="(max-width: 1023px) 100vw, 1px"
              unoptimized={images[selectedImage].includes('cdn.sanity.io')}
              className="object-cover"
              priority
              loading="eager"
            />
            {/* Sin burbuja de descuento sobre la foto: el −X% ya va junto al
                precio, que es donde se decide, y encima del producto tapaba la
                foto que el comprador vino a ver. */}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            // Con más de 4 fotos las miniaturas se aplastaban en óvalos: el
            // flex las encogía para que cupieran. Ahora se deslizan.
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`Ver imagen ${index + 1}`}
                  className={cn(
                    "relative w-16 h-16 shrink-0 rounded-xl overflow-hidden ring-2 transition-all",
                    selectedImage === index ? "ring-primary" : "ring-border/50 hover:ring-primary/50 opacity-70 hover:opacity-100"
                  )}
                >
                  <Image
                    src={sanityCdnImage(image, 200)}
                    alt={`${product.name} - Vista ${index + 1}`}
                    fill
                    sizes="64px"
                    unoptimized={image.includes('cdn.sanity.io')}
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info — full width, desktop version gets its own column from page layout */}
        <div className="space-y-6">
          {/* Bloque de título.
              EL H1 ES EL NOMBRE DEL PRODUCTO, no el gancho de la IA. Antes era
              al revés: el nombre salía como una pastilla gris de 12 px encima y
              el titular grande era el gancho ("Aprende a rodar sin caídas").
              Eso dejaba dos cosas rotas:

                · El comprador leía una frase de campaña donde esperaba saber
                  QUÉ es lo que está mirando. El nombre es el dato; el gancho
                  es el argumento, y va después.
                · `generateMetadata` ya usa `product.name` como <title> de la
                  página, así que el <title> y el <h1> decían cosas distintas.
                  Ahora coinciden, que es lo que Google espera de una ficha.

              Tipografía: Montserrat 800 REAL (los pesos se cargan en
              layout.tsx; antes el navegador lo falsificaba engordando el 700) y
              tracking negativo para que el nombre se lea como un bloque.

              Los tamaños son más contenidos que los del gancho porque un
              nombre de producto es mucho más largo —"Bicicleta de Equilibrio
              HappyBaby 4 Ruedas Antivuelco Infantil" son 62 caracteres frente a
              los ~30 de un gancho—, y a 46 px eso ocupaba media pantalla de
              móvil antes de que se viera el precio.

              El escalón de `lg` es MENOR que el de `xl` a propósito: en 1024 px
              es justo donde la ficha se parte en dos columnas y la del texto
              cae a ~472 px. A 36 px ahí caben 21 caracteres por renglón y este
              nombre sale en cuatro líneas dejando "Infantil" solo en la última;
              a 34 px caben 23 y sale en tres que llenan el ancho. El tamaño
              grande espera a `xl`, cuando la columna ya da 600 px.

              El color va en tinta (`--ink-title`) y no en rojo ni lila: el
              salmón es solo del botón de compra y la lavanda es interfaz. El
              nombre informa, así que se despega por contraste, no por color.

              `text-pretty` y NO `text-balance`. Balance iguala el largo de
              todos los renglones, y en un título centrado eso dibuja una
              pirámide: ningún renglón llega al borde y quedan huecos a los dos
              lados. Pretty deja que cada renglón llene el ancho y solo evita
              que la última línea quede con una palabra suelta, que era lo único
              que valía la pena de balance. */}
          {/* CORONA CENTRADA: categoría → nombre → gancho → medios de pago.
              Se centra este bloque y NO la columna entera, a propósito.

              Centrar párrafos largos se paga caro: al saltar de renglón el ojo
              tiene que buscar dónde empieza el siguiente, porque el borde
              izquierdo deja de ser una referencia fija. Por eso lo que se
              centra son piezas cortas y de "exhibición" —la categoría, el
              nombre, el gancho de 40 caracteres, los chips de pago— y el texto
              que de verdad se lee (subtítulo y descripción) se queda alineado a
              la izquierda.

              De paso el precio, que ya estaba centrado, deja de ser el único
              elemento centrado de la columna: ahora rima con la cabecera en
              vez de parecer un descuadre. */}
          <div className="text-center space-y-3">
            {/* La categoría sube ENCIMA del nombre. Antes iba debajo, en una
                fila partida con los chips de pago a la derecha; con el nombre
                centrado, esa fila izquierda-derecha cortaba el bloque por la
                mitad. Arriba funciona como antetítulo y es además el orden que
                el comprador espera: primero de qué familia es, luego qué es. */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {/* Neutro, no salmón: el salmón es el color del botón de compra
                  y nada más puede llevarlo, o deja de destacar. */}
              <span className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {product.category}
              </span>
              {product.isBestSeller && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  Más Vendido
                </span>
              )}
            </div>

            <h1 className="font-serif text-2xl leading-[1.2] md:text-[2rem] md:leading-[1.15] lg:text-[2.125rem] lg:leading-[1.12] xl:text-[2.5rem] xl:leading-[1.1] font-extrabold text-ink-title tracking-[-0.02em] text-pretty">
              {product.name}
            </h1>

            {/* El gancho de la IA. Solo si dice algo distinto del nombre:
                `heroTitle` cae a `product.name` cuando el producto no tiene
                copy generado, y repetir el nombre a media tinta justo debajo
                del titular parece un fallo de plantilla.

                VA EN LAVANDA (`--todopolis-lavender-deep`, 7.77:1) y no en
                gris. El gancho es la promesa del producto, y la lavanda es
                justo el acento que el sistema reserva para lo aspiracional
                —premium, belleza, Lucy—. En gris se confundía con la
                descripción que lleva debajo, que es información, no promesa.

                No se usa el azul de la marca aunque sea el color del logo: el
                azul ya significa "hecho verificable" (pago, envío, garantía,
                stock) y un gancho no es un hecho comprobable. Y el azul del
                logo tal cual (#7BBFFD) da 1.96:1 sobre blanco — no alcanza ni
                el mínimo de texto grande. */}
            {hasHook && (
              <p className="text-base md:text-lg font-semibold text-todopolis-lavender-deep leading-snug text-balance">
                {heroTitle}
              </p>
            )}

            {/* Antes aquí iba "4.8 (3 reseñas)" con el rating hardcodeado.
                Se reemplaza por la señal que de verdad cierra la venta en
                Colombia; las estrellas vuelven con reseñas reales atadas a un
                pedido (ver "Reseñas reales — pendiente" en CLAUDE.md). */}
            {/* Oculto en móvil: el bloque de confianza de más abajo ya lista
                los mismos medios y con contexto. Repetirlos aquí solo gastaba
                dos renglones de una pantalla donde el precio todavía no se ve. */}
            <PaymentMethods variant="inline" className="hidden sm:flex justify-center" />
          </div>

          {/* Subtitle — a la izquierda: son 160 caracteres, ya es texto de
              lectura y centrarlo obliga al ojo a buscar el inicio de cada
              renglón. */}
          {/* Oculto en móvil: ahí el precio queda demasiado lejos, y la historia
              y los beneficios de más abajo dicen lo mismo con más espacio. */}
          {(product as any).heroSubtitle && (
            <p className="hidden sm:block text-xl text-muted-foreground leading-relaxed">
              {(product as any).heroSubtitle}
            </p>
          )}

          {/* Descripción como viñetas, sin los emojis que trae de la IA
              (`lib/description.ts`). Antes era un párrafo con ✅🔥⭐ incrustados
              y un «Ver más» en móvil. */}
          {bullets.length > 1 ? (
            <ul className="space-y-2.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex gap-3 text-base md:text-lg text-foreground/80 leading-snug">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-todopolis-lavender-deep" strokeWidth={3} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : bullets.length === 1 ? (
            <p className="text-lg text-muted-foreground leading-relaxed">{bullets[0]}</p>
          ) : null}

          {/* Disponibilidad. «Entre los más vendidos» ya no se repite aquí:
              la etiqueta «Más vendido» sobre el nombre dice lo mismo, y
              decirlo dos veces en una pantalla suena a insistir. */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">Disponible · llega en 3 a 7 días hábiles</span>
          </div>

          {/* Variant Selector — solo aparece si el producto tiene variantes.
              Va ANTES del precio: elegir talla o color es una decisión previa a
              mirar cuánto cuesta. */}
          <VariantSelector />

          {/* PRECIO Y BOTÓN SON UN SOLO BLOQUE, a propósito.
              Antes el recuadro de medios de pago se metía entre los dos: las
              dos cosas que cierran la venta —cuánto cuesta y dónde hago clic—
              quedaban separadas por un bloque entero. Aquí van pegadas, con
              12 px entre ellas.

              El filete es solo SUPERIOR. Con filete arriba y abajo el precio se
              leía como una ficha cerrada y dejaba al botón fuera; con uno solo,
              la línea separa este bloque de la descripción y deja que precio y
              botón se lean como una misma unidad.

              El precio comparte tipografía con el nombre del producto
              (Montserrat) para que las dos cosas que el comprador busca suenen
              a una sola voz, y `tabular-nums` evita que los dígitos bailen. */}
          <div className="space-y-3 pt-5 border-t border-border/60">
            <div className="space-y-2 text-center">
              <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
                <span className="font-serif text-[2.25rem] sm:text-[2.5rem] md:text-[2.75rem] leading-none font-extrabold text-ink-title tracking-[-0.02em] tabular-nums">
                  {formatPrice(product.price ?? 0)}
                </span>
                {(product as any).originalPrice && (
                  <span className="font-serif text-lg md:text-xl font-medium text-muted-foreground line-through tabular-nums">
                    {formatPrice((product as any).originalPrice)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sale-soft px-2.5 py-1 text-xs font-bold text-sale">
                    <Zap className="w-3 h-3 fill-current" />
                    -{discount}%
                  </span>
                )}
              </div>
              {/* Countdown de oferta — texto compacto, justo bajo el precio */}
              {(product as any).offerName && (product as any).offerEndsAt && (
                <OfferCountdownInline
                  offerName={(product as any).offerName}
                  offerEndsAt={(product as any).offerEndsAt}
                  price={product.price ?? 0}
                  originalPrice={(product as any).originalPrice ?? undefined}
                />
              )}
            </div>

            {/* Combos por cantidad. Radios nativos: se eligen con teclado y
                el lector de pantalla los anuncia como grupo. */}
            {offers.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="sr-only">Cantidad</legend>
                {[{ quantity: 1, totalPrice: product.price ?? 0, label: undefined as string | undefined }, ...offers].map((o) => {
                  const savings = savingsForQuantity(product.price ?? 0, o.quantity, offers);
                  const active = qty === o.quantity;
                  return (
                    <label
                      key={o.quantity}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors',
                        active ? 'border-ink-title bg-surface-soft' : 'border-nav-inactive-border hover:border-foreground/30'
                      )}
                    >
                      <input
                        type="radio"
                        name="quantity-offer"
                        value={o.quantity}
                        checked={active}
                        onChange={() => setSelectedQty(o.quantity)}
                        className="h-4 w-4 accent-[var(--ink-title)]"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-ink-title">
                          {o.quantity === 1 ? '1 unidad' : `Lleva ${o.quantity}`}
                          {o.label && (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                              {o.label}
                            </span>
                          )}
                        </span>
                        {savings > 0 && (
                          <span className="block text-sm text-trust-fg font-semibold">Ahorras {formatPrice(savings)}</span>
                        )}
                      </span>
                      <span className="font-serif font-extrabold tabular-nums text-ink-title">{formatPrice(o.totalPrice)}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2.5 px-5 py-4 rounded-2xl font-bold transition-all duration-300",
                  "text-base md:text-lg whitespace-nowrap",
                  "bg-cta text-cta-fg hover:bg-cta-hover shadow-xl shadow-cta-ring hover:shadow-2xl",
                  "hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                <ShoppingBag className="w-5 h-5 shrink-0" />
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
          </div>

          {/* Tres hechos en tres renglones, debajo del botón. Antes aquí iban el
              recuadro de dos tarjetas de medios de pago y tres cajas azules
              («Compra segura» incluida, que no dice nada comprobable): en
              móvil empujaban todo casi una pantalla. La explicación completa de
              cómo se paga vive ahora en la sección «Cómo pagas», y el enlace
              lleva ahí. */}
          <ul className="space-y-2 text-sm text-foreground/80">
            <li className="flex items-start gap-2.5">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-trust-fg" />
              <span>
                <strong className="font-semibold text-ink-title">{product.isDestacado ? 'Envío gratis' : 'Envío $12.000'}</strong> · llega en 3 a 7 días hábiles
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-trust-fg" />
              <span>
                <strong className="font-semibold text-ink-title">
                  {process.env.NEXT_PUBLIC_CONFIO_ENABLED === 'true' ? 'Paga al recibir o con Confío' : 'Pagas al recibir'}
                </strong>
                {process.env.NEXT_PUBLIC_CONFIO_ENABLED === 'true' && (
                  <>
                    {' · '}
                    <a href="#como-pagas" className="underline decoration-nav-inactive-border underline-offset-4 hover:decoration-current">
                      cómo funciona
                    </a>
                  </>
                )}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-trust-fg" />
              <span>
                <strong className="font-semibold text-ink-title">30 días</strong> si llega con defecto de fábrica
              </span>
            </li>
          </ul>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        product={product} 
        initialQuantity={qty}
      />
    </section>

    {/* En Destacados NO hay barra de compra abajo: la cabecera de campaña ya
        lleva «Comprar» fijo arriba, y dos botones fijos a la vez se leían
        como insistencia. WhatsApp, que iba dentro de la barra, vuelve como
        burbuja abajo a la derecha, igual que en el resto del sitio. */}
    {product.isDestacado && whatsappHref && !isCheckoutOpen && (
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribirnos por WhatsApp"
        className="md:hidden fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/15 active:scale-95 transition-transform"
        style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <WhatsAppIcon className="h-7 w-7" />
      </a>
    )}

    {/* Barra fija de compra en móvil, SOLO en la ficha normal: su cabecera
        (la de la tienda) no tiene botón de compra, y sin esta barra el
        comprador perdería el botón al bajar. WhatsApp va DENTRO, a la
        izquierda: flotando encima de la barra tapaba el nombre del producto
        (ver whatsapp-button.tsx, que en la ficha no se pinta en móvil). */}
    {!product.isDestacado && !isCheckoutOpen && (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex gap-2 animate-in slide-in-from-bottom-5">
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribirnos por WhatsApp"
          className="flex w-14 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-black/15 active:scale-[0.98] transition-transform"
        >
          <WhatsAppIcon className="h-6 w-6" />
        </a>
      )}
      <button
        onClick={() => setIsCheckoutOpen(true)}
        className="flex-1 min-w-0 flex items-center justify-between gap-3 px-5 py-4 rounded-2xl font-bold text-lg bg-cta text-cta-fg shadow-2xl shadow-cta-ring active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingBag className="w-5 h-5 shrink-0" />
          <span className="truncate">{heroCta}</span>
        </div>
        <span className="text-cta-fg/80 font-medium whitespace-nowrap">
          {formatPrice(selectedTotal)}
        </span>
      </button>
    </div>
    )}
    </>
  );
}
