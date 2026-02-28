import { NextResponse } from "next/server";

export const runtime = "edge";

const SHIPPING_OPTIONS = {
  nationwide: {
    id: "nationwide",
    label: "Nationwide",
    amount: 6,
    description: "Nationwide delivery"
  },
  rural: {
    id: "rural",
    label: "Rural",
    amount: 12,
    description: "Rural delivery"
  },
  pickup: {
    id: "pickup",
    label: "Free pick-up",
    amount: 0,
    description: "Pickup is available from Auckland CBD (weekdays 9.30am till 6pm)."
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
    const selectedShipping =
      SHIPPING_OPTIONS[String(body?.shippingOptionId || "").toLowerCase()] || SHIPPING_OPTIONS.nationwide;

    if (!rawItems.length) {
      return NextResponse.json({ error: "No cart items found." }, { status: 400 });
    }

    const items = rawItems
      .filter((item) => item && typeof item.name === "string")
      .map((item) => ({
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        unitAmount: Math.max(0, Number(item.price) || 0),
        name: item.name,
        description: `${item.set || "Trade Me"} • ${item.rarity || "Listing"}`
      }));

    if (!items.length) {
      return NextResponse.json({ error: "No valid items in cart." }, { status: 400 });
    }

    if (selectedShipping.amount > 0) {
      items.push({
        quantity: 1,
        unitAmount: selectedShipping.amount,
        name: `Shipping - ${selectedShipping.label}`,
        description: selectedShipping.description
      });
    }

    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${origin}/order-success?order={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${origin}/checkout`);
    params.append("metadata[shipping_option]", selectedShipping.label);
    params.append("metadata[shipping_cost]", selectedShipping.amount ? selectedShipping.amount.toFixed(2) : "0.00");
    params.append(
      "metadata[pickup_note]",
      selectedShipping.id === "pickup"
        ? "Pickup is available from Auckland CBD (weekdays 9.30am till 6pm)."
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
