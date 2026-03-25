'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, X, MapPin, Phone, User, CheckCircle2, Truck } from 'lucide-react';
import { createOrder } from '@/app/actions/create-order';
import { cn } from '@/lib/utils';
import { Product } from '@/lib/types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export function CheckoutModal({ isOpen, onClose, product }: CheckoutModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setLoading(false);
      setQuantity(1);
    }
  }, [isOpen]);

  const formatPrice = (price: number) => {
    return '$ ' + price.toLocaleString('es-CO');
  };

  const shippingCost = 12000;
  const totalPrice = ((product.price ?? 0) * quantity) + shippingCost;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append('productId', (product as any).slug || (product as any)._id || '');
    formData.append('productName', product.name);
    formData.append('price', totalPrice.toString());
    formData.append('quantity', quantity.toString());

    const result = await createOrder(formData);

    setLoading(false);

    if (result.success) {
      setStep(2); // Show success step
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
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              {step === 1 ? 'Compra Rápida' : '¡Pedido Confirmado!'}
            </h2>
            {step === 1 && (
              <p className="text-sm text-gray-500 mt-1">Pago Contraentrega 📦</p>
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
              {/* Product Summary */}
              <div className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
                  <img 
                    src={product.image || (product as any).images?.[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center w-full">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-500 text-sm">Precio:</span>
                    <span className="font-medium text-gray-900">{formatPrice(product.price ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-500 text-sm">Envío:</span>
                    <span className="font-medium text-gray-900">{formatPrice(shippingCost)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-gray-500 text-sm">Cantidad:</span>
                    <div className="flex items-center gap-2 bg-gray-100/50 rounded-lg p-1 border border-gray-200">
                      <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors font-medium cursor-pointer text-gray-700">-</button>
                      <span className="w-6 text-center font-semibold text-gray-900 text-sm">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors font-medium cursor-pointer text-gray-700">+</button>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">Total a Pagar:</span>
                    <span className="text-xl font-black text-primary">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 animate-in fade-in">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      name="customerName" 
                      required
                      placeholder="Tu nombre completo"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-base"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="tel" 
                      name="customerPhone" 
                      required
                      placeholder="Tu celular (WhatsApp)"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-base"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative col-span-2 sm:col-span-1">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        name="customerCity" 
                        required
                        placeholder="Ciudad / Municipio"
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-base"
                      />
                    </div>
                    <div className="relative col-span-2 sm:col-span-1">
                      <input 
                        type="text" 
                        name="customerAddress" 
                        required
                        placeholder="Dirección completa"
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-base"
                      />
                    </div>
                  </div>
                </div>

              </form>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                <CheckCircle2 className="w-10 h-10 text-green-500 absolute scale-0 animate-[bounce_0.5s_0.2s_both]" />
                {/* CSS Confetti Effect (simplified) */}
                <div className="absolute inset-0 animate-[spin_3s_linear_infinite] opacity-50">
                  <div className="absolute top-0 w-2 h-2 bg-pink-400 rounded-full" />
                  <div className="absolute bottom-0 w-2 h-2 bg-blue-400 rounded-full" />
                  <div className="absolute left-0 w-2 h-2 bg-yellow-400 rounded-full" />
                  <div className="absolute right-0 w-2 h-2 bg-primary rounded-full" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Pedido Exitoso! 🎉</h3>
              <p className="text-gray-600 mb-6 max-w-sm">
                Hemos recibido tu pedido de <span className="font-semibold text-gray-900">{product.name}</span>. Pronto nos contactaremos por WhatsApp para confirmar el envío.
              </p>
              <div className="p-4 bg-primary/5 rounded-2xl flex items-center gap-3 text-primary font-medium w-full justify-center">
                <Truck className="w-5 h-5" />
                ¡Pagas al recibir en casa! 🏡
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50/50">
          {step === 1 ? (
            <button
              form="checkout-form"
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300",
                "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
                "active:scale-[0.98]",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Completar Pedido <span className="opacity-80 font-normal">({formatPrice(totalPrice)})</span></>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl text-primary font-bold text-lg bg-primary/10 hover:bg-primary/20 transition-all active:scale-[0.98]"
            >
              Seguir comprando
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
