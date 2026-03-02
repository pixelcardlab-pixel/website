function parseAmountTotal(value) {
  if (!Number.isFinite(Number(value))) return 0;
  return Number(value) / 100;
}

function fromUnixSeconds(value) {
  if (!Number.isFinite(Number(value))) return "";
  return new Date(Number(value) * 1000).toISOString();
}

function mapStripeSessionToOrder(session) {
  const metadata = session?.metadata && typeof session.metadata === "object" ? session.metadata : {};
  const customerDetails =
    session?.customer_details && typeof session.customer_details === "object" ? session.customer_details : {};
  const paymentIntentId =
    typeof session?.payment_intent === "string"
      ? session.payment_intent
      : typeof session?.payment_intent?.id === "string"
        ? session.payment_intent.id
        : "";

  return {
    publicId: String(metadata.order_id || session?.id || ""),
    status: String(session?.payment_status || "pending"),
    createdAt: fromUnixSeconds(session?.created),
    updatedAt: fromUnixSeconds(session?.created),
    customerEmail: String(session?.customer_email || customerDetails.email || ""),
    currency: String(session?.currency || "usd").toLowerCase(),
    amountTotal: parseAmountTotal(session?.amount_total),
    customer: {
      firstName: String(metadata.first_name || ""),
      lastName: String(metadata.last_name || ""),
      phone: String(metadata.phone || customerDetails.phone || "")
    },
    shipping: {
      label: String(metadata.shipping_option || ""),
      amount: Number(metadata.shipping_cost || 0)
    },
    address: {
      line1: String(metadata.address_line1 || ""),
      line2: String(metadata.address_line2 || ""),
      suburb: String(metadata.address_suburb || ""),
      city: String(metadata.address_city || ""),
      region: String(metadata.address_region || ""),
      postcode: String(metadata.address_postcode || ""),
      country: String(metadata.address_country || ""),
      isRural: String(metadata.delivery_rural || "").toLowerCase() === "yes",
      deliveryInstructions: String(metadata.delivery_instructions || ""),
      authorityToLeave: String(metadata.authority_to_leave || "").toLowerCase() === "yes"
    },
    stripe: {
      checkoutSessionId: String(session?.id || ""),
      paymentIntentId
    }
  };
}

async function fetchStripeCheckoutSessions(secretKey, limit = 100) {
  const params = new URLSearchParams();
  params.append("limit", String(Math.max(1, Math.min(100, Number(limit) || 100))));
  params.append("expand[]", "data.payment_intent");

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`
    },
    cache: "no-store"
  });

  const parsed = await response.json();
  if (!response.ok) {
    const message = parsed?.error?.message || "Failed to load Stripe checkout sessions.";
    throw new Error(message);
  }

  return Array.isArray(parsed?.data) ? parsed.data : [];
}

export async function listAdminOrdersFromStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY. Add it to your Cloudflare Pages production environment variables.");
  }

  const sessions = await fetchStripeCheckoutSessions(secretKey, 100);
  return sessions.map(mapStripeSessionToOrder).sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
}
