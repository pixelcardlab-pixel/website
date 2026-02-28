"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CART_KEY } from "@/lib/storage";

const CartContext = createContext(null);

function sanitizeCartItem(item) {
  if (!item || typeof item.id !== "string") {
    return null;
  }

  const price = Number.isFinite(item.price) ? Number(item.price) : 0;

  return {
    id: item.id,
    name: item.name || "Item",
    price,
    image: item.image || "",
    set: item.set || "",
    rarity: item.rarity || "",
    sourceUrl: item.sourceUrl || "",
    quantity: 1
  };
}

function parseStoredCart(rawValue) {
  try {
    const value = JSON.parse(rawValue || "[]");
    if (!Array.isArray(value)) return [];

    const unique = new Map();
    for (const item of value.map(sanitizeCartItem).filter(Boolean)) {
      if (!unique.has(item.id)) unique.set(item.id, item);
    }
    return Array.from(unique.values());
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CART_KEY);
    setItems(parseStoredCart(stored));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, isLoaded]);

  const itemCount = useMemo(() => items.length, [items]);
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.price, 0), [items]);

  const addItem = (product) => {
    const next = sanitizeCartItem({ ...product, quantity: 1 });
    if (!next) return;

    setItems((current) => {
      const found = current.find((item) => item.id === next.id);
      if (found) {
        return current;
      }

      return [...current, next];
    });
  };

  const removeItem = (productId) => {
    setItems((current) => current.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, nextQuantity) => {
    setItems((current) =>
      current.map((item) => (item.id === productId ? { ...item, quantity: 1 } : item))
    );
  };

  const clearCart = () => setItems([]);

  const value = {
    items,
    itemCount,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isLoaded
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
