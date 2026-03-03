import { NextResponse } from "next/server";
import { calculateNzPostShippingQuote } from "@/lib/shipping";
import { getManualListingsStockByIds } from "@/lib/manual-listings";

export const runtime = "edge";

const SHIPPING_OPTIONS = {
  pickup: {
    id: "pickup",
    label: "Pickup (Auckland CBD)",
    amount: 0,
    description: "Pickup is available from Auckland CBD (weekdays 9:30am-6:00pm)."
  }
};

function appendLineItem(params, index, item) {
  params.append(`line_items[${index}][quantity]`, String(item.quantity));
  params.append(`line_items[${index}][price_data][currency]`, "usd");
  params.append(`line_items[${index}][price_data][unit_amount]`, String(Math.round(item.unitAmount * 100)));
  params.append(`line_items[${index}][price_data][product_data][name]`, item.name);
  if (item.description) {
    params.append(`line_items[${index}][price_data][product_data][description]`, item.description);
  }
}

function parseQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

function normalizeSourceType(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "manual") return normalized;
  return "";
}

function inferSourceType(item) {
  const explicit = normalizeSourceType(item?.sourceType);
  if (explicit) return explicit;
  return "manual";
}

function createPublicOrderId() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PCL-${y}${m}${d}-${rand}`;
}

function encodeManualItemsMetadata(items) {
  const encoded = items
    .filter((item) => item && item.productId)
    .map((item) => `${encodeURIComponent(item.productId)}:${parseQuantity(item.quantity)}`)
    .join(",");
  return encoded.slice(0, 500);
}

export async function POST(request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        {
          error:
            "Missing STRIPE_SECRET_KEY. Add STRIPE_SECRET_KEY to .env.local before using Stripe checkout."
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    const shippingOptionId = String(body?.shippingOptionId || "delivery").toLowerCase();
    const shippingAddress = body?.address && typeof body.address === "object" ? body.address : {};
    const customer = body?.customer && typeof body.customer === "object" ? body.customer : {};

    if (!rawItems.length) {
      return NextResponse.json({ error: "No cart items found." }, { status: 400 });
    }

    const items = rawItems
      .filter((item) => item && typeof item.name === "string")
      .map((item) => ({
        productId: String(item.id || "").trim(),
        sourceType: inferSourceType(item),
        quantity: parseQuantity(item.quantity),
        maxQuantity: parseQuantity(item.maxQuantity),
        unitAmount: Math.max(0, Number(item.price) || 0),
        name: item.name,
        description: `${item.set || "Pixel Card Lab"} • ${item.rarity || "Listing"}`,
        postageSize: item.postageSize || ""
      }));

    if (!items.length) {
      return NextResponse.json({ error: "No valid items in cart." }, { status: 400 });
    }

    const manualItems = items.filter((item) => item.sourceType === "manual" && item.productId);
    if (manualItems.length) {
      const stockById = await getManualListingsStockByIds(manualItems.map((item) => item.productId));
      for (const item of manualItems) {
        const stock = stockById.get(item.productId);
        if (!stock || String(stock.status || "").toLowerCase() === "sold" || Number(stock.quantity || 0) <= 0) {
          return NextResponse.json(
            { error: `${item.name} is no longer available. Please refresh your cart.` },
            { status: 409 }
          );
        }
        if (item.quantity > Number(stock.quantity || 0)) {
          return NextResponse.json(
            {
              error: `Only ${stock.quantity} left for ${item.name}. Please reduce quantity in cart.`
            },
            { status: 409 }
          );
        }
      }
    }

    const selectedShipping =
      shippingOptionId === "pickup"
        ? SHIPPING_OPTIONS.pickup
        : calculateNzPostShippingQuote(items, shippingAddress);

    if (selectedShipping.amount > 0) {
      items.push({
        quantity: 1,
        productId: "",
        sourceType: "shipping",
        unitAmount: selectedShipping.amount,
        name: `Shipping - ${selectedShipping.label}`,
        description: selectedShipping.description
      });
    }

    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const publicOrderId = createPublicOrderId();
    const manualItemsMetadata = encodeManualItemsMetadata(manualItems);

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${origin}/order-success?order=${publicOrderId}&session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${origin}/checkout`);
    params.append("customer_email", String(customer?.email || ""));
    params.append("metadata[order_id]", publicOrderId);
    params.append("metadata[inventory_applied]", "no");
    params.append("metadata[manual_items]", manualItemsMetadata);
    params.append("payment_intent_data[metadata][order_id]", publicOrderId);
    params.append("payment_intent_data[metadata][inventory_applied]", "no");
    params.append("payment_intent_data[metadata][manual_items]", manualItemsMetadata);
    params.append("metadata[shipping_option]", selectedShipping.label);
    params.append("metadata[shipping_cost]", selectedShipping.amount ? selectedShipping.amount.toFixed(2) : "0.00");
    params.append("metadata[parcel_size]", selectedShipping.parcelSize || "");
    params.append("metadata[parcel_dimensions]", selectedShipping.parcelDimensions || "");
    params.append("metadata[delivery_island]", selectedShipping.island || "");
    params.append("metadata[delivery_rural]", selectedShipping.isRural ? "yes" : "no");
    params.append("metadata[first_name]", String(customer?.firstName || ""));
    params.append("metadata[last_name]", String(customer?.lastName || ""));
    params.append("metadata[phone]", String(customer?.phone || ""));
    params.append("metadata[address_line1]", String(shippingAddress?.line1 || ""));
    params.append("metadata[address_line2]", String(shippingAddress?.line2 || ""));
    params.append("metadata[address_suburb]", String(shippingAddress?.suburb || ""));
    params.append("metadata[address_city]", String(shippingAddress?.city || ""));
    params.append("metadata[address_region]", String(shippingAddress?.region || ""));
    params.append("metadata[address_postcode]", String(shippingAddress?.postcode || ""));
    params.append("metadata[address_country]", String(shippingAddress?.country || ""));
    params.append("metadata[delivery_instructions]", String(shippingAddress?.deliveryInstructions || ""));
    params.append("metadata[authority_to_leave]", shippingAddress?.authorityToLeave ? "yes" : "no");
    params.append(
      "metadata[pickup_note]",
      selectedShipping.id === "pickup"
        ? "Pickup Auckland CBD, Monday-Friday 9:30am-6:00pm. Pickup by arrangement only."
        : ""
    );

    items.forEach((item, index) => appendLineItem(params, index, item));

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const stripeData = await stripeResponse.json();
    if (!stripeResponse.ok) {
      const stripeMessage = stripeData?.error?.message || "Stripe checkout failed.";
      return NextResponse.json({ error: stripeMessage }, { status: stripeResponse.status });
    }

    return NextResponse.json({ url: stripeData?.url || null });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Stripe checkout failed." }, { status: 500 });
  }
}
