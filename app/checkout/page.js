"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/providers/cart-provider";
import { formatCurrency } from "@/lib/currency";
import { testimonials } from "@/data/products";
import { FounderNote } from "@/components/shop/founder-note";
import { FAVORITES_KEY } from "@/lib/storage";

function parseStoredFavorites(raw) {
  try {
    const value = JSON.parse(raw || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const { items, itemCount, subtotal, removeItem } = useCart();
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFavoriteIds(parseStoredFavorites(window.localStorage.getItem(FAVORITES_KEY)));
  }, []);

  const handleStripeCheckout = async () => {
    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not start Stripe checkout.");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (checkoutError) {
      setError(checkoutError.message);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-wrap checkout-page-normal">
      <header className="topbar glass reveal">
        <div className="brand">
          <Link href="/" aria-label="Go to homepage">
            <Image src="/pixel-card-lab-logo.png" alt="Pixel Card Lab" width={220} height={62} priority />
          </Link>
        </div>
        <div className="topbar-right">
          <nav className="nav-links">
            <Link href="/">Shop</Link>
            <a href="https://www.nzpost.co.nz/tools/tracking" target="_blank" rel="noreferrer">
              Track My Order
            </a>
          </nav>
          <div className="topbar-actions">
            <button type="button" className="icon-pill" aria-label="Favourite items">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21.35 10.55 20C5.4 15.24 2 12.1 2 8.25A5.25 5.25 0 0 1 7.25 3c1.8 0 3.52.84 4.75 2.17A6.29 6.29 0 0 1 16.75 3 5.25 5.25 0 0 1 22 8.25c0 3.85-3.4 6.99-8.55 11.75Z" />
              </svg>
              <span>{favoriteIds.length}</span>
            </button>
            <Link href="/checkout" className="checkout-btn">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4h-2l-1 2v2h2l2.5 7.5h8.5l3-9h-13zM9.8 18a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zm7.4 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z" />
              </svg>
              <span>Checkout</span>
              <small>{itemCount}</small>
            </Link>
          </div>
        </div>
      </header>

      <div className="checkout-wrap checkout-wrap-review reveal">
        <section className="summary-card checkout-summary-first checkout-summary-page-card">
          <div className="cart-head">
            <h2>Cart</h2>
            <span>{itemCount} item(s)</span>
          </div>

          <div className="checkout-items-list">
            {!items.length ? (
              <p className="empty-cart">Your cart is empty.</p>
            ) : (
              items.map((item) => (
                <article key={item.id} className="checkout-item-card">
                  <div className="checkout-item-thumb">
                    <Image src={item.image || "/pixel-card-lab-logo.png"} alt={item.name} fill sizes="140px" />
                  </div>
                  <div className="checkout-item-content">
                    <h3>{item.name}</h3>
                    <div className="checkout-item-foot">
                      <div>
                        <p className="checkout-item-qty">Qty: {item.quantity}</p>
                        <strong>{formatCurrency(item.price * item.quantity)}</strong>
                      </div>
                      <button className="checkout-remove-btn" onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="summary-total">
            <div className="grand">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
          </div>

          <p className="checkout-shipping-note">Shipping options calculated on the next checkout page.</p>

          {error ? <p className="error-text">{error}</p> : null}

          <div className="checkout-actions checkout-actions-review">
            <button className="checkout-primary" onClick={handleStripeCheckout} disabled={isSubmitting || !items.length}>
              {isSubmitting ? "Redirecting..." : "Proceed to checkout"}
            </button>
            <Link href="/" className="continue-shopping-link">
              Continue shopping
            </Link>
          </div>
        </section>
      </div>

      <section className="testimonials reveal">
        <div className="testimonials-head">
          <h2>What Buyers Say</h2>
          <a href="https://www.trademe.co.nz/a/member/1438352" target="_blank" rel="noreferrer">
            View Trade Me Profile
          </a>
        </div>
        <p className="trust-stats">99.9% positive feedback • Trade Me address verified</p>
        <div className="testimonial-grid">
          {testimonials.map((item) => (
            <article key={item.id} className="testimonial-card">
              <p>"{item.quote}"</p>
              <span className="testimonial-byline">{item.byline}</span>
            </article>
          ))}
        </div>
      </section>
      <FounderNote />

      <footer className="footer reveal">
        <div>
          <h4>About</h4>
          <a href="#">Our Story</a>
          <a href="#">Store Policies</a>
          <a href="#">Contact</a>
        </div>
        <div>
          <h4>Support</h4>
          <a href="#">Shipping</a>
          <a href="#">Returns</a>
          <a href="#">FAQ</a>
        </div>
        <div className="footer-brand">
          <Image src="/pixel-card-lab-logo.png" alt="Pixel Card Lab" width={132} height={26} />
          <p>&copy;2026 Pixel Card Lab All rights reserved</p>
        </div>
      </footer>
    </main>
  );
}
