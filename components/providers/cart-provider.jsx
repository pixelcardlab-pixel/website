"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CART_KEY } from "@/lib/storage";
import { inferPostageSizeFromText, normalizePostageSize } from "@/lib/shipping";

const CartContext = createContext(null);

function parsePositiveInt(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function inferMaxQuantity(item) {
  const candidate = Number(item?.maxQuantity ?? item?.availableQuantity ?? item?.stockQuantity ?? item?.quantity);
  if (!Number.isFinite(candidate)) return 1;
  return Math.max(1, Math.floor(candidate));
}

function inferSourceType(item) {
  const explicit = String(item?.sourceType || "").toLowerCase();
  if (explicit === "manual") return explicit;
  return "manual";
}

function sanitizeCartItem(item) {
  if (!item || typeof item.id !== "string") {
    return null;
  }

  const price = Number.isFinite(item.price) ? Number(item.price) : 0;
  const maxQuantity = inferMaxQuantity(item);
  const quantity = Math.min(parsePositiveInt(item.quantity, 1), maxQuantity);
  const sourceType = inferSourceType(item);

  return {
    id: item.id,
    name: item.name || "Item",
    price,
    image: item.image || "",
    description: item.description || "",
    set: item.set || "",
    rarity: item.rarity || "",
    postageSize:
      normalizePostageSize(item.postageSize) ||
      inferPostageSizeFromText(`${item.name || ""} ${item.description || ""}`),
    sourceUrl: item.sourceUrl || "",
    quantity,
    maxQuantity,
    sourceType
  };
}

function parseStoredCart(rawValue) {
  try {
    const value = JSON.parse(rawValue || "[]");
    if (!Array.isArray(value)) return [];

    const unique = new Map();
    for (const item of value.map(sanitizeCartItem).filter(Boolean)) {
      if (!unique.has(item.id)) {
        unique.set(item.id, item);
        continue;
      }
      const existing = unique.get(item.id);
      const maxQuantity = Math.max(existing.maxQuantity || 1, item.maxQuantity || 1);
      unique.set(item.id, {
        ...existing,
        ...item,
        maxQuantity,
        quantity: Math.min((existing.quantity || 1) + (item.quantity || 1), maxQuantity)
      });
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

  const itemCount = useMemo(() => items.reduce((total, item) => total + Number(item.quantity || 1), 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 1), 0),
    [items]
  );

  const addItem = (product) => {
    const next = sanitizeCartItem({
      ...product,
      maxQuantity: inferMaxQuantity(product),
      quantity: 1
    });
    if (!next) return;

    setItems((current) => {
      const found = current.find((item) => item.id === next.id);
      if (found) {
        const mergedMax = Math.max(found.maxQuantity || 1, next.maxQuantity || 1);
        const incrementedQuantity = Math.min((found.quantity || 1) + 1, mergedMax);
        if (incrementedQuantity === found.quantity && mergedMax === found.maxQuantity) return current;
        return current.map((item) =>
          item.id === next.id
            ? {
                ...item,
                maxQuantity: mergedMax,
                quantity: incrementedQuantity
              }
            : item
        );
      }

      return [...current, next];
    });
  };

  const removeItem = (productId) => {
    setItems((current) => current.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, nextQuantity) => {
    setItems((current) => {
      const target = current.find((item) => item.id === productId);
      if (!target) return current;
      const safeQuantity = Math.min(parsePositiveInt(nextQuantity, target.quantity || 1), target.maxQuantity || 1);
      if (safeQuantity === target.quantity) return current;
      return current.map((item) => (item.id === productId ? { ...item, quantity: safeQuantity } : item));
    });
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
