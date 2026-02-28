"use client";

import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { useCart } from "@/components/providers/cart-provider";

export function CartPanel() {
  const { items, itemCount, subtotal, removeItem } = useCart();

  return (
    <aside className="cart-panel">
      <div className="cart-head">
        <h3>Cart</h3>
        <span>{itemCount} item(s)</span>
      </div>

      <div className="cart-list">
        {items.length === 0 ? (
          <p className="empty-cart">Your cart is empty.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="cart-thumb">
                <Image
                  src={item.image || "/pixel-card-lab-logo.png"}
                  alt={item.name}
                  fill
                  sizes="72px"
                />
              </div>
              <div className="cart-item-content">
                <div className="cart-item-head">
                  <p>{item.name}</p>
                  <small>{item.rarity}</small>
                </div>
                <div className="cart-item-foot">
                  <div className="cart-item-meta">
                    <small>Qty: 1</small>
                    <strong>{formatCurrency(item.price)}</strong>
                  </div>
                  <button className="remove-btn" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cart-footer">
        <div className="subtotal-row">
          <span>Subtotal</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>
        <Link className="checkout-link" href="/checkout">
          Checkout
        </Link>
      </div>
    </aside>
  );
}
