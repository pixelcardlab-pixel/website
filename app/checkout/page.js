"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/providers/cart-provider";
import { formatCurrency } from "@/lib/currency";
import { ORDERS_KEY } from "@/lib/storage";

const SHIPPING_OPTIONS = [
  {
    id: "nationwide",
    label: "Nationwide",
    amount: 6,
    description: "Nationwide delivery"
  },
  {
    id: "rural",
    label: "Rural",
    amount: 12,
    description: "Rural delivery"
  },
  {
    id: "pickup",
    label: "Free pick-up",
    amount: 0,
    description: "Pickup is available from Auckland CBD (weekdays 9.30am till 6pm)."
  }
];

function getStoredOrders() {
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [shippingOptionId, setShippingOptionId] = useState(SHIPPING_OPTIONS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedShippingOption = useMemo(
    () => SHIPPING_OPTIONS.find((option) => option.id === shippingOptionId) || SHIPPING_OPTIONS[0],
    [shippingOptionId]
  );
  const shipping = useMemo(() => (items.length ? selectedShippingOption.amount : 0), [items.length, selectedShippingOption]);
  const total = subtotal + shipping;

  const handleLocalCheckout = () => {
    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }

    if (!email || (!address && selectedShippingOption.id !== "pickup")) {
      setError("Please enter email and shipping address.");
      return;
    }

    const orderId = `LOCAL-${Date.now()}`;
    const orders = getStoredOrders();
    orders.push({
      id: orderId,
      placedAt: new Date().toISOString(),
      email,
      address,
      items,
      subtotal,
      shipping,
      shippingOption: selectedShippingOption,
      total,
      method: "local"
    });

    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    clearCart();
    router.push(`/order-success?order=${orderId}`);
  };

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
          items,
          shippingOptionId: selectedShippingOption.id
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
    <main className="checkout-page">
      <div className="checkout-wrap">
        <section className="checkout-card">
          <p className="eyebrow dark">Checkout</p>
          <h1>Complete Your Order</h1>
          <p className="muted-text">Local checkout works now. Stripe checkout works once keys are set.</p>
          <p className="shop-notice checkout-notice">
            Shipping only available in NZ, for international orders visit our{" "}
            <a href="https://ebay.us/m/LH1wno" target="_blank" rel="noreferrer">
              eBay store
            </a>
            .
          </p>
          <div className="shipping-options">
            <h3>Shipping & pick-up options</h3>
            {SHIPPING_OPTIONS.map((option) => (
              <label key={option.id} className="shipping-option">
                <input
                  type="radio"
                  name="shippingOption"
                  value={option.id}
                  checked={shippingOptionId === option.id}
                  onChange={() => setShippingOptionId(option.id)}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <em>{option.amount ? formatCurrency(option.amount) : "Free"}</em>
              </label>
            ))}
          </div>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Shipping Address
            <textarea
              rows={4}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={selectedShippingOption.id === "pickup" ? "Optional for pickup" : "Street, city, postcode"}
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <div className="checkout-actions">
            <button onClick={handleLocalCheckout}>Place Local Order</button>
            <button className="stripe" onClick={handleStripeCheckout} disabled={isSubmitting}>
              {isSubmitting ? "Redirecting..." : "Pay with Stripe"}
            </button>
          </div>

          <Link href="/" className="back-link">
            ← Continue Shopping
          </Link>
        </section>

        <aside className="summary-card">
          <h2>Order Summary</h2>
          <div className="summary-list">
            {items.map((item) => (
              <div className="summary-item" key={item.id}>
                <span>
                  {item.name} x{item.quantity}
                </span>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-total">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>{formatCurrency(shipping)}</strong>
            </div>
            <div className="grand">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
