'use client';

import { useState, useEffect } from 'react';
import { ConfioLogo } from './confio-logo';
import { ShoppingBag, X, CheckCircle2, Truck, Star, Banknote } from 'lucide-react';
import { createOrder } from '@/app/actions/create-order';
import { cn } from '@/lib/utils';
import { sanityCdnImage } from '@/lib/sanity/cdn-image';
import { Product } from '@/lib/types';
import { useProductVariant } from '@/components/product/product-variant-context';
import { VariantSelector } from '@/components/product/variant-selector';
import { trackInitiateCheckout, trackLead, newEventId } from '@/lib/fbpixel';
import { priceForQuantity, savingsForQuantity } from '@/lib/quantity-offers';
import { validateDelivery, type DeliveryField, type DeliveryInput } from '@/lib/checkout/delivery';
import {
  DeliveryFields,
  EMPTY_DELIVERY,
  loadSavedDelivery,
  saveDelivery,
  type DeliveryErrors,
} from '@/components/checkout/delivery-fields';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  /** Cantidad elegida en el selector de combos del hero. */
  initialQuantity?: number;
  /** Forma de pago elegida al abrir (los botones «Contraentrega» / «Confío» de la ficha). */
  initialPaymentMethod?: 'cod' | 'confio';
}

export function CheckoutModal({ isOpen, onClose, product, initialQuantity = 1, initialPaymentMethod = 'cod' }: CheckoutModalProps) {
  const [step, setStep] = useState(1);
  // 'cod' = contraentrega (el de siempre). 'confio' = pagar ya con Confío.
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'confio'>('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [delivery, setDelivery] = useState<DeliveryInput>(EMPTY_DELIVERY);
  const [fieldErrors, setFieldErrors] = useState<DeliveryErrors>({});

  // Variantes: si el producto las tiene, elegir una es obligatorio.
  const { variants, selectedVariant } = useProductVariant();
  const offers = product.quantityOffers;
  const variantRequired = variants.length > 0;
  const variantMissing = variantRequired && !selectedVariant;

  const productId = (product as any).slug || (product as any)._id || product.id || '';

  // Reset state + evento InitiateCheckout cuando se abre el modal.
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setLoading(false);
      setQuantity(initialQuantity);
      // Confío solo si está encendido; si no, el botón no existe y vale contraentrega.
      setPaymentMethod(initialPaymentMethod === 'confio' && process.env.NEXT_PUBLIC_CONFIO_ENABLED === 'true' ? 'confio' : 'cod');
      setFieldErrors({});
      setDelivery(loadSavedDelivery());
      trackInitiateCheckout({
        id: productId,
        value: priceForQuantity(product.price ?? 0, initialQuantity, offers),
        quantity: initialQuantity,
      });
    }
  }, [isOpen]);

  const formatPrice = (price: number) => {
    return '$ ' + price.toLocaleString('es-CO');
  };

  // Pago anticipado con Confío. Se muestra solo si está encendido Y el total
  // llega al mínimo de la pasarela ($10.000): ofrecer un botón que va a
  // responder 409 es peor que no ofrecerlo.
  const confioEnabled = process.env.NEXT_PUBLIC_CONFIO_ENABLED === 'true';

  // Productos Destacados → envío gratis.
  const isDestacado = (product as any).isDestacado === true;
  const shippingCost = isDestacado ? 0 : 12000;
  // Subtotal con combos por cantidad (`lib/quantity-offers.ts`), el mismo
  // cálculo que hace la ruta de Confío en el servidor.
  const subtotal = priceForQuantity(product.price ?? 0, quantity, offers);
  const savings = savingsForQuantity(product.price ?? 0, quantity, offers);
  const totalPrice = subtotal + shippingCost;
  // Mínimo de Confío. Debajo de eso la pasarela rechaza con 400.
  const canPayUpfront = confioEnabled && totalPrice >= 10000;

  // Al corregir un campo se borra SU error, no los demás: el comprador ve qué
  // le falta todavía.
  const clearFieldError = (field: DeliveryField) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const showFieldErrors = (errors: DeliveryErrors) => {
    setFieldErrors(errors);
    setError('Revisa los campos marcados en rojo.');
    // Lleva al primer campo con error: en el celular suele estar fuera de la
    // pantalla, detrás del teclado.
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('#checkout-form [aria-invalid="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Mismas reglas que aplica el servidor (`lib/checkout/delivery.ts`).
    const checked = validateDelivery(delivery);
    if (!checked.ok) {
      showFieldErrors(checked.errors);
      return;
    }
    const d = checked.data;
    setLoading(true);

    const formData = new FormData();
    formData.append('nombre', d.nombre);
    formData.append('telefono', d.telefono);
    formData.append('departamentoCode', d.departamentoCode);
    formData.append('ciudadCode', d.ciudadCode);
    formData.append('direccion', d.direccion);
    formData.append('barrio', d.barrio);
    formData.append('indicaciones', d.indicaciones ?? '');

    formData.append('productId', productId);
    formData.append('quantity', quantity.toString());

    if (variantRequired && !selectedVariant) {
      setError('Por favor selecciona una opción del producto.');
      setLoading(false);
      return;
    }

    // ── Pago anticipado: se crea el pedido y el cobro en el servidor y el
    //    navegador se va a Confío. NO se dispara Purchase aquí: todavía no ha
    //    pagado nadie, y contarlo ahora ensuciaría la optimización de anuncios.
    //    El pedido se confirma cuando la reconciliación ve FUNDED.
    if (paymentMethod === 'confio') {
      try {
        const res = await fetch('/api/checkout/confio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            quantity,
            delivery,
            ...(selectedVariant
              ? { variantId: selectedVariant.idVariant, variantName: selectedVariant.name }
              : {}),
          }),
        });
        const data = await res.json();
        if (res.status === 400 && data.fields) {
          showFieldErrors(data.fields);
          setLoading(false);
          return;
        }
        if (!res.ok || !data.checkoutUrl) {
          // Se queda en el modal con la contraentrega disponible: un fallo de
          // la pasarela no puede costar la venta.
          setError(data.error || 'No pudimos generar el link de pago. Puedes pedirlo contraentrega.');
          setPaymentMethod('cod');
          setLoading(false);
          return;
        }
        saveDelivery(delivery);
        window.location.href = data.checkoutUrl;
        return;
      } catch {
        setError('No pudimos conectar con la pasarela. Puedes pedirlo contraentrega.');
        setPaymentMethod('cod');
        setLoading(false);
        return;
      }
    }

    // event_id compartido navegador↔CAPI para deduplicar el Lead.
    const fbEventId = newEventId();
    formData.append('fbEventId', fbEventId);

    if (variantRequired && selectedVariant) {
      formData.append('variantId', String(selectedVariant.idVariant));
      formData.append('variantName', selectedVariant.name);
    }

    const result = await createOrder(formData);

    setLoading(false);

    if (result.success) {
      // Lead del navegador (el espejo CAPI lo envía createOrder con el mismo
      // eventId). NO es Purchase: todavía no ha pagado nadie — ver lib/fbpixel.ts.
      trackLead(
        {
          id: productId,
          value: totalPrice,
          quantity,
          userData: { phone: d.telefono, name: d.nombre, city: d.ciudad },
        },
        fbEventId,
      );
      saveDelivery(delivery);
      setStep(2); // Show success step
    } else if (result.fields) {
      showFieldErrors(result.fields);
    } else {
      setError(result.error || 'Algo salió mal, intenta de nuevo.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 ease-out z-10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-nav-inactive-border">
          <div>
            <h2 className="font-serif text-xl font-extrabold tracking-[-0.01em] text-ink-title flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-ink-title" />
              {step === 1 ? 'Tu pedido' : 'Pedido recibido'}
            </h2>
            {step === 1 && (
              <p className="text-sm text-muted-foreground mt-1">
                {confioEnabled ? 'Paga al recibir o con Confío' : 'Pagas al recibir'}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 flex-1">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Banner Destacado — envío gratis */}
              {isDestacado && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-200 bg-amber-50">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-700">
                    <Star className="w-4 h-4" fill="currentColor" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-amber-900 leading-tight">Producto destacado · Envío gratis</p>
                    <p className="text-xs text-amber-800/80 leading-tight mt-0.5">El envío va por nuestra cuenta y con despacho prioritario.</p>
                  </div>
                </div>
              )}

              {/* Product Summary */}
              <div className="flex gap-4 p-4 rounded-2xl bg-surface-soft border border-nav-inactive-border">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
                  {/* Miniatura de 80 px: se pide al CDN de Sanity a 200 px. El
                      original es un PNG de varios MB y dejaba el recuadro en
                      blanco mientras el comprador llenaba el formulario. */}
                  <img
                    src={sanityCdnImage(product.image || (product as any).images?.[0] || '/placeholder.jpg', 200)}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center w-full">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                  {variantRequired && selectedVariant && (
                    <p className="text-xs font-semibold text-todopolis-lavender-deep mt-0.5">
                      Opción: {selectedVariant.name}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-500 text-sm">Precio:</span>
                    <span className="font-medium text-gray-900">{formatPrice(product.price ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-500 text-sm">Envío:</span>
                    {isDestacado ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-gray-400 text-xs line-through">{formatPrice(12000)}</span>
                        <span className="font-bold text-amber-700">Gratis</span>
                      </span>
                    ) : (
                      <span className="font-medium text-gray-900">{formatPrice(shippingCost)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-gray-500 text-sm">Cantidad:</span>
                    <div className="flex items-center gap-2 bg-gray-100/50 rounded-lg p-1 border border-gray-200">
                      <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors font-medium cursor-pointer text-gray-700">-</button>
                      <span className="w-6 text-center font-semibold text-gray-900 text-sm">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors font-medium cursor-pointer text-gray-700">+</button>
                    </div>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-500 text-sm">Ahorro del combo:</span>
                      <span className="font-bold text-trust-fg">−{formatPrice(savings)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
                    <span className="font-bold text-ink-title text-sm">Total a pagar</span>
                    <span className="font-serif text-xl font-extrabold tabular-nums text-ink-title">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Variant Selector — obligatorio si el producto tiene variantes */}
              {variantRequired && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <VariantSelector showHint />
                </div>
              )}

              {/* Método de pago. Solo aparece si el pago anticipado está
                  disponible; si no, el checkout es el de siempre. */}
              {canPayUpfront && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                    ¿Cómo prefieres pagar?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={cn(
                        'text-left p-3.5 rounded-xl border-2 transition-all',
                        paymentMethod === 'cod'
                          ? 'border-todopolis-lavender-deep bg-todopolis-lavender-deep/5'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      )}
                    >
                      <span className="flex items-center gap-2 font-bold text-sm text-gray-900">
                        <Truck className="w-4 h-4 shrink-0" />
                        Contraentrega
                      </span>
                      <span className="block mt-1 text-xs text-gray-500 leading-snug">
                        Pagas en efectivo cuando lo recibes en casa.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('confio')}
                      className={cn(
                        'text-left p-3.5 rounded-xl border-2 transition-all',
                        paymentMethod === 'confio'
                          ? 'border-todopolis-lavender-deep bg-todopolis-lavender-deep/5'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      )}
                    >
                      <span className="flex items-center gap-2 font-bold text-sm text-gray-900">
                        <ConfioLogo variant="icon" className="h-4 w-4 shrink-0" />
                        Pagar ya con Confío
                      </span>
                      <span className="block mt-1 text-xs text-gray-500 leading-snug">
                        PSE, Nequi o Bancolombia, en segundos desde tu celular.
                      </span>
                      <ConfioLogo className="mt-2 h-4" />
                    </button>
                  </div>

                  {paymentMethod === 'confio' && (
                    <p className="mt-3 text-xs text-gray-600 leading-relaxed bg-white border border-gray-200 rounded-xl p-3">
                      Te llevamos a <span className="font-semibold">Confío</span> para
                      que pagues con PSE, Nequi o Bancolombia. El pago se confirma
                      solo en minutos: no tienes que mandarnos comprobantes.
                    </p>
                  )}
                </div>
              )}

              {/* Form */}
              <form id="checkout-form" onSubmit={handleSubmit} noValidate className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 animate-in fade-in">
                    {error}
                  </div>
                )}
                
                <DeliveryFields
                  value={delivery}
                  onChange={setDelivery}
                  errors={fieldErrors}
                  onFieldEdit={clearFieldError}
                />

              </form>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center text-center">
              {/* Quieta: sin confeti girando ni rebotes (guía de marca §8). */}
              <div className="w-16 h-16 bg-trust-bg rounded-full flex items-center justify-center mb-5">
                <CheckCircle2 className="w-8 h-8 text-trust-fg" />
              </div>
              <h3 className="font-serif text-2xl font-extrabold tracking-[-0.02em] text-ink-title mb-2">Recibimos tu pedido</h3>
              <p className="text-muted-foreground mb-6 max-w-sm leading-relaxed">
                Pediste <span className="font-semibold text-ink-title">{product.name}</span>. Te escribimos por WhatsApp para confirmar el envío.
              </p>
              {/* A este paso SOLO se llega por contraentrega: el pago con
                  Confío redirige a la pasarela antes de mostrarlo. */}
              <ul className="w-full space-y-2 text-left text-sm">
                <li className="flex items-center gap-3 rounded-2xl bg-trust-bg p-3.5 font-semibold text-trust-fg">
                  <Truck className="w-5 h-5 shrink-0" />
                  Llega en 3 a 7 días hábiles
                </li>
                <li className="flex items-center gap-3 rounded-2xl bg-trust-bg p-3.5 font-semibold text-trust-fg">
                  <Banknote className="w-5 h-5 shrink-0" />
                  Pagas en efectivo al recibirlo
                </li>
                {isDestacado && (
                  <li className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 font-semibold text-amber-800">
                    <Star className="w-5 h-5 shrink-0 text-amber-600" fill="currentColor" strokeWidth={1.5} />
                    El envío va por nuestra cuenta
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50/50">
          {step === 1 ? (
            <button
              form="checkout-form"
              type="submit"
              disabled={loading || variantMissing}
              className={cn(
                "w-full py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300",
                "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
                "active:scale-[0.98]",
                (loading || variantMissing) && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : variantMissing ? (
                <>Elige una opción para continuar</>
              ) : paymentMethod === 'confio' ? (
                <>Ir a pagar <span className="opacity-80 font-normal">({formatPrice(totalPrice)})</span></>
              ) : (
                <>Confirmar pedido <span className="opacity-80 font-normal">({formatPrice(totalPrice)})</span></>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl text-ink-title font-bold text-lg border border-nav-inactive-border bg-surface hover:bg-surface-soft transition-all active:scale-[0.98]"
            >
              Seguir comprando
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
