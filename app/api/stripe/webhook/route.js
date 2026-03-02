import { NextResponse } from "next/server";
import { decrementManualListingStock } from "@/lib/manual-listings";

export const runtime = "edge";

const encoder = new TextEncoder();

export async function POST(request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secretKey || !webhookSecret) {
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
    const isValidSignature = await verifyStripeSignature(rawBody, signature, webhookSecret);
    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
    }

    const event = JSON.parse(rawBody || "{}");

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const paymentStatus = String(session?.payment_status || "").toLowerCase();
      if (paymentStatus === "paid" && typeof session?.id === "string" && session.id.trim()) {
        const inventoryApplied = await hasInventoryAlreadyBeenApplied(session, secretKey);
        if (!inventoryApplied) {
          const manualItems = decodeManualItemsMetadata(session?.metadata?.manual_items || "");
          for (const item of manualItems) {
            await decrementManualListingStock(item.productId, item.quantity);
          }
          await markInventoryApplied(session, secretKey);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Webhook handling failed." }, { status: 400 });
  }
}

function decodeManualItemsMetadata(raw) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return [];

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const splitIndex = entry.lastIndexOf(":");
      if (splitIndex <= 0) return null;
      const productId = decodeURIComponent(entry.slice(0, splitIndex));
      const quantity = Math.max(1, Math.floor(Number(entry.slice(splitIndex + 1)) || 1));
      if (!productId) return null;
      return { productId, quantity };
    })
    .filter(Boolean);
}

async function verifyStripeSignature(rawBody, signatureHeader, webhookSecret) {
  const parts = String(signatureHeader || "")
    .split(",")
    .map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatureParts = parts.filter((part) => part.startsWith("v1="));
  if (!timestampPart || !signatureParts.length) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > 300) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = await hmacSha256Hex(webhookSecret, signedPayload);

  for (const part of signatureParts) {
    const provided = part.slice(3);
    if (constantTimeEqual(expected, provided)) {
      return true;
    }
  }

  return false;
}

async function hmacSha256Hex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hasInventoryAlreadyBeenApplied(session, secretKey) {
  const paymentIntentId =
    typeof session?.payment_intent === "string" && session.payment_intent.trim() ? session.payment_intent : "";
  if (!paymentIntentId) {
    return String(session?.metadata?.inventory_applied || "").toLowerCase() === "yes";
  }
  const paymentIntent = await stripeApi(`/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`, {
    method: "GET",
    secretKey
  });
  return String(paymentIntent?.metadata?.inventory_applied || "").toLowerCase() === "yes";
}

async function markInventoryApplied(session, secretKey) {
  const paymentIntentId =
    typeof session?.payment_intent === "string" && session.payment_intent.trim() ? session.payment_intent : "";
  if (!paymentIntentId) return;

  await stripeApi(`/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`, {
    method: "POST",
    secretKey,
    body: {
      "metadata[inventory_applied]": "yes"
    }
  });
}

async function stripeApi(path, { method, secretKey, body = null }) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: method === "POST" ? new URLSearchParams(body || {}).toString() : undefined
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Stripe API request failed.");
  }
  return data;
}
