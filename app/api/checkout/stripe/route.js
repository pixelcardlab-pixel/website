import { NextResponse } from "next/server";
import Stripe from "stripe";

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

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
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

    const lineItems = rawItems
      .filter((item) => item && typeof item.name === "string")
      .map((item) => {
        const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const unitPrice = Math.max(0, Number(item.price) || 0);

        return {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(unitPrice * 100),
            product_data: {
              name: item.name,
              description: `${item.set || "Trade Me"} • ${item.rarity || "Listing"}`
            }
          }
        };
      });

    if (!lineItems.length) {
      return NextResponse.json({ error: "No valid items in cart." }, { status: 400 });
    }

    if (selectedShipping.amount > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(selectedShipping.amount * 100),
          product_data: {
            name: `Shipping - ${selectedShipping.label}`,
            description: selectedShipping.description
          }
        }
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      metadata: {
        shipping_option: selectedShipping.label,
        shipping_cost: selectedShipping.amount ? selectedShipping.amount.toFixed(2) : "0.00",
        pickup_note:
          selectedShipping.id === "pickup"
            ? "Pickup is available from Auckland CBD (weekdays 9.30am till 6pm)."
            : ""
      },
      success_url: `${origin}/order-success?order={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Stripe checkout failed." }, { status: 500 });
  }
}
