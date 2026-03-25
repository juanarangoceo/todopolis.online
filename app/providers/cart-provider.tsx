'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Product } from '@/lib/types'

export interface CartItem {
  product: Product
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  totalItems: number
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  const addToCart = useCallback((product: Product) => {
    setItems(prev => {
      const id = (product as any).slug || product.id
      const existing = prev.find(i => ((i.product as any).slug || i.product.id) === id)
      if (existing) {
        return prev.map(i => ((i.product as any).slug || i.product.id) === id
          ? { ...i, quantity: i.quantity + 1 }
          : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    setIsOpen(true)
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => ((i.product as any).slug || i.product.id) !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => ((i.product as any).slug || i.product.id) !== productId))
    } else {
      setItems(prev => prev.map(i => ((i.product as any).slug || i.product.id) === productId
        ? { ...i, quantity }
        : i
      ))
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  return (
    <CartContext.Provider value={{ items, totalItems, addToCart, removeFromCart, updateQuantity, clearCart, isOpen, openCart, closeCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
