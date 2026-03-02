const PARCEL_SIZE_ORDER = {
  small: 1,
  medium: 2,
  large: 3
};

const NZ_POST_BASE_RATES = {
  north: { small: 6, medium: 8, large: 14 },
  south: { small: 8, medium: 10, large: 16 }
};

const NZ_POST_RURAL_SURCHARGE = {
  small: 3,
  medium: 3,
  large: 5
};

const SOUTH_ISLAND_KEYWORDS = [
  "south island",
  "christchurch",
  "dunedin",
  "queenstown",
  "invercargill",
  "nelson",
  "timaru",
  "blenheim",
  "greymouth"
];

export const PARCEL_DIMENSIONS = {
  small: "2cm x 18cm x 12cm",
  medium: "2cm x 18cm x 12cm",
  large: "50cm x 40cm x 20cm"
};

export const DELIVERY_TIMEFRAMES = {
  north: "North Island: 1-3 business days.",
  south: "South Island: 2-5 business days.",
  rural: "Rural delivery: additional 1-3 business days."
};

export function normalizePostageSize(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .trim();
  if (normalized === "small" || normalized === "small parcel") return "small";
  if (normalized === "medium" || normalized === "medium parcel") return "medium";
  if (normalized === "large" || normalized === "large parcel") return "large";
  return "";
}

export function inferPostageSizeFromText(text) {
  const haystack = String(text || "").toLowerCase();
  if (!haystack) return "small";

  if (
    /(elite trainer box|booster box|bundle|sealed box|tin|collection box|large parcel|jumbo)/.test(haystack)
  ) {
    return "large";
  }

  if (/(deck box|binder|medium parcel|bulk lot)/.test(haystack)) {
    return "medium";
  }

  return "small";
}

export function determineParcelSize(items = []) {
  let best = "small";
  for (const item of items) {
    const normalized = normalizePostageSize(item?.postageSize);
    const inferred =
      normalized || inferPostageSizeFromText(`${item?.name || ""} ${item?.description || ""}`);
    if (PARCEL_SIZE_ORDER[inferred] > PARCEL_SIZE_ORDER[best]) {
      best = inferred;
    }
  }
  return best;
}

export function detectIslandFromAddress(address = {}) {
  const explicit = String(address?.island || "")
    .toLowerCase()
    .trim();
  if (explicit === "south") return "south";
  if (explicit === "north") return "north";

  const postcode = String(address?.postcode || "").trim();
  if (/^[7-9]/.test(postcode)) return "south";

  const haystack = `${address?.suburb || ""} ${address?.city || ""} ${address?.region || ""}`.toLowerCase();
  if (SOUTH_ISLAND_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return "south";
  }

  return "north";
}

export function detectRuralAddress(address = {}) {
  if (address?.isRural) return true;
  const haystack = `${address?.line1 || ""} ${address?.line2 || ""} ${address?.suburb || ""} ${address?.city || ""}`;
  return /\b(rd|rural)\b/i.test(haystack);
}

export function calculateNzPostShippingQuote(items = [], address = {}) {
  const parcelSize = determineParcelSize(items);
  const island = detectIslandFromAddress(address);
  const isRural = detectRuralAddress(address);

  const base = NZ_POST_BASE_RATES[island][parcelSize];
  const rural = isRural ? NZ_POST_RURAL_SURCHARGE[parcelSize] : 0;
  const amount = Number((base + rural).toFixed(2));

  return {
    id: isRural ? "delivery-rural" : "delivery",
    label: isRural ? "Courier delivery (rural)" : "Courier delivery",
    amount,
    parcelSize,
    parcelDimensions: PARCEL_DIMENSIONS[parcelSize],
    island,
    isRural,
    description: `NZ Post ${parcelSize} parcel (${PARCEL_DIMENSIONS[parcelSize]})`
  };
}
