"use client";

import Link from "next/link";
import { useCart } from "@/components/providers/cart-provider";

export function ItemDetailActions({ item }) {
  const { addItem, items } = useCart();
  const inCart = items.find((cartItem) => cartItem.id === item.id);
  const cartQuantity = Number(inCart?.quantity || 0);
  const maxQuantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
  const isAtMax = cartQuantity >= maxQuantity;
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
        disabled={isSold || isAtMax}
      >
        {isAtMax ? "Max Qty" : cartQuantity > 0 ? "Add Another" : "Add to Cart"}
      </button>
      <a href={mailtoHref} className="ask-link">
        Ask a question
      </a>
    </div>
  );
}
