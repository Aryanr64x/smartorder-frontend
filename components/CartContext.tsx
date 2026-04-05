"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export interface CartItem {
  name: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (name: string) => void;
  removeOne: (name: string) => void;
  removeAll: (name: string) => void;
  clearCart: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (name: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === name);
      if (existing) {
        return prev.map((i) => i.name === name ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { name, quantity: 1 }];
    });
  };

  const removeOne = (name: string) => {
    setCart((prev) =>
      prev
        .map((i) => i.name === name ? { ...i, quantity: i.quantity - 1 } : i)
        .filter((i) => i.quantity > 0)
    );
  };

  const removeAll = (name: string) => {
    setCart((prev) => prev.filter((i) => i.name !== name));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeOne, removeAll, clearCart, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}