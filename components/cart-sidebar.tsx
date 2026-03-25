'use client'

import { X, ShoppingBag, Trash2, Plus, Minus } from 'lucide-react'
import Image from 'next/image'
import { useCart } from '@/app/providers/cart-provider'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { CheckoutModal } from '@/components/checkout-modal'

export function CartSidebar() {
  const { items, isOpen, closeCart, removeFromCart, updateQuantity, totalItems } = useCart()
  const [checkoutProduct, setCheckoutProduct] = useState<any | null>(null)

  const formatPrice = (price: number) => '$ ' + price.toLocaleString('es-CO')

  const subtotal = items.reduce((sum, item) => sum + (item.product.price ?? 0) * item.quantity, 0)
  const shipping = 12000
  const total = subtotal + shipping

  // Build a combined product for the checkout modal representing all items
  const handleCheckout = () => {
    if (items.length === 0) return
    // Pass the first item as representative; price is the full cart total
    const combined = {
      ...items[0].product,
      price: subtotal,
      name: items.length === 1
        ? items[0].product.name
        : `${items.length} productos seleccionados`,
    }
    setCheckoutProduct(combined)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={closeCart}
      />

      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900">Mi Carrito</h2>
            {totalItems > 0 && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">{totalItems}</span>
            )}
          </div>
          <button onClick={closeCart} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">Tu carrito está vacío</p>
              <button onClick={closeCart} className="text-primary text-sm font-semibold hover:underline">
                Seguir comprando →
              </button>
            </div>
          ) : (
            items.map(({ product, quantity }) => {
              const id = (product as any).slug || product.id
              const image = product.image || (product as any).images?.[0]
              return (
                <div key={id} className="flex gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  {/* Image */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white shadow-sm">
                    {image && (
                      <Image src={image} alt={product.name} fill sizes="80px" className="object-cover" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2">{product.name}</p>
                    <p className="text-primary font-bold mt-1">{formatPrice((product.price ?? 0) * quantity)}</p>
                    <div className="flex items-center justify-between mt-2">
                      {/* Qty stepper */}
                      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                        <button
                          onClick={() => updateQuantity(id, quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors text-gray-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(id, quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors text-gray-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-gray-100 space-y-3 bg-gray-50">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Envío</span>
              <span className="font-medium text-gray-900">{formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-lg pt-1 border-t border-gray-200">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className={cn(
                'w-full py-4 rounded-2xl font-bold text-lg text-white',
                'bg-primary hover:bg-primary/90 transition-all',
                'shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40',
                'active:scale-[0.98]'
              )}
            >
              Pagar ahora 🚀
            </button>
          </div>
        )}
      </aside>

      {/* Checkout Modal (triggered from cart) */}
      {checkoutProduct && (
        <CheckoutModal
          isOpen={!!checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          product={checkoutProduct}
        />
      )}
    </>
  )
}
