import Stripe from "stripe";
import { NextResponse } from "next/server";
import {
  markOrderInventoryAdjusted,
  markOrderInventoryItemApplied,
  markOrderPaidFromCheckoutSession
} from "@/lib/orders-store";
import { decrementManualListingStock } from "@/lib/manual-listings";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20"
});

export async function POST(request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET for webhook verification." },
        { status: 400 }
      );
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature header." }, { status: 400 });
    }

    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const order = await markOrderPaidFromCheckoutSession(session);
      const paymentStatus = String(session?.payment_status || "").toLowerCase();
      if (paymentStatus === "paid") {
        await applyManualInventoryUpdate(order, session.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Webhook handling failed." }, { status: 400 });
  }
}

async function applyManualInventoryUpdate(order, checkoutSessionId) {
  if (!order || !checkoutSessionId) return;
  if (order?.inventory?.adjustedAt) return;

  const appliedKeys = new Set(
    Array.isArray(order?.inventory?.appliedItemKeys) ? order.inventory.appliedItemKeys : []
  );
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const manualItems = orderItems.filter(
    (item) =>
      String(item?.sourceType || "").toLowerCase() === "manual" &&
      typeof item?.productId === "string" &&
      item.productId.trim()
  );

  for (const item of manualItems) {
    const itemKey = item.productId.trim();
    if (appliedKeys.has(itemKey)) continue;
    await decrementManualListingStock(itemKey, Math.max(1, Math.floor(Number(item.quantity) || 1)));
    await markOrderInventoryItemApplied(checkoutSessionId, itemKey);
    appliedKeys.add(itemKey);
  }

  await markOrderInventoryAdjusted(checkoutSessionId);
}
