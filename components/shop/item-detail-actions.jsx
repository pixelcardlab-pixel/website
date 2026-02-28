"use client";

import Link from "next/link";
import { useCart } from "@/components/providers/cart-provider";

export function ItemDetailActions({ item }) {
  const { addItem, items } = useCart();
  const isInCart = items.some((cartItem) => cartItem.id === item.id);
  const isSold = item.status === "sold";
  const subject = encodeURIComponent(`Question: ${item.name}`);
  const mailtoHref = `mailto:pixelcardlab@gmail.com?subject=${subject}`;

  return (
    <div className="detail-actions">
      <Link href="/" className="back-btn">
        Back to shop
      </Link>
      <button
        type="button"
        className="detail-add-btn"
        onClick={() => addItem(item)}
        disabled={isSold || isInCart}
      >
        {isInCart ? "In Cart" : "Add to Cart"}
      </button>
      <a href={mailtoHref} className="ask-link">
        Ask a question
      </a>
    </div>
  );
}
