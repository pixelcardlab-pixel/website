"use client";

import Link from "next/link";
import { useState } from "react";

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [result, setResult] = useState("");

  const handleTrack = (event) => {
    event.preventDefault();
    if (!orderId.trim()) {
      setResult("Enter an order ID first.");
      return;
    }

    setResult(`Order ${orderId.trim()} received. Status: Processing.`);
  };

  return (
    <main className="checkout-page">
      <section className="success-card">
        <p className="eyebrow dark">Track Order</p>
        <h1>Track My Order</h1>
        <p className="muted-text">Enter your order ID (for now this is a placeholder tracker).</p>

        <form onSubmit={handleTrack} className="search-bar" style={{ marginTop: 12 }}>
          <input
            type="text"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            placeholder="e.g. LOCAL-123456789"
          />
          <button type="submit">Track</button>
        </form>

        {result ? <p style={{ marginTop: 12 }}>{result}</p> : null}

        <Link href="/" className="back-link">
          ← Back to Shop
        </Link>
      </section>
    </main>
  );
}
