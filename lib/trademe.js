import cachedListings from "@/data/trademe-listings-cache.json";
import { getBestImageUrl } from "@/lib/image-url";

const TRADEME_MEMBER_SEARCH_URL =
  process.env.TRADEME_MEMBER_SEARCH_URL ||
  "https://www.trademe.co.nz/a/search?member_listing=1438352";

function uniqueStrings(values) {
  return values.filter((value, index, all) => typeof value === "string" && value && all.indexOf(value) === index);
}

function getListingImages(listing) {
  const urls = uniqueStrings([
    listing?.PictureHref || "",
    ...(Array.isArray(listing?.PhotoUrls) ? listing.PhotoUrls : [])
  ]);
  return urls.map((url) => getBestImageUrl(url));
}

function getListingDescription(listing) {
  const candidates = [
    listing?.Body,
    listing?.Description,
    listing?.ShortDescription,
    listing?.Subtitle
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) || "";
}

function getListingCondition(listing) {
  if (typeof listing?.Condition === "string" && listing.Condition.trim()) {
    return listing.Condition.trim();
  }
  if (typeof listing?.ConditionDisplayName === "string" && listing.ConditionDisplayName.trim()) {
    return listing.ConditionDisplayName.trim();
  }
  if (listing?.IsNew === true) return "New";
  if (listing?.IsNew === false) return "Used";
  return "";
}

function parseMemberListingId(searchUrl) {
  try {
    const url = new URL(searchUrl);
    const member = url.searchParams.get("member_listing");
    return member || "1438352";
  } catch {
    return "1438352";
  }
}

function buildTradeMeApiUrl(memberListingId) {
  const params = new URLSearchParams({
    member_listing: memberListingId,
    rows: "22",
    return_canonical: "true",
    return_metadata: "true",
    return_ads: "true",
    return_empty_categories: "true",
    return_super_features: "true",
    return_did_you_mean: "true",
    return_variants: "true",
    auto_category_jump: "true",
    snap_parameters: "true",
    mp_rows_override: "56",
    preferred_shipping_location: "use_delivery_address",
    return_parameter_counts: "all"
  });

  return `https://api.trademe.co.nz/v1/search/general.json?${params.toString()}`;
}

function listingToProduct(listing, nowIso) {
  const listingId = String(listing?.ListingId || "").trim();
  if (!listingId) return null;

  const canonicalPath = listing?.CanonicalPath || "";
  const sourceUrl = canonicalPath ? `https://www.trademe.co.nz/a${canonicalPath}` : "";
  const images = getListingImages(listing);
  const picture = images[0] || "";
  const rawPrice = Number.isFinite(listing?.BuyNowPrice)
    ? listing.BuyNowPrice
    : Number.isFinite(listing?.StartPrice)
      ? listing.StartPrice
      : 0;

  return {
    id: `tm-${listingId}`,
    listingId,
    name: listing?.Title || `Trade Me listing ${listingId}`,
    price: rawPrice,
    quantity: 1,
    sourceType: "trademe",
    image: getBestImageUrl(picture || ""),
    images,
    description: getListingDescription(listing),
    details: {
      condition: getListingCondition(listing)
    },
    badge: "Trade Me",
    set: "Trade Me",
    rarity: "Marketplace Listing",
    status: "active",
    postageSize: "",
    sourceUrl,
    syncedAt: nowIso
  };
}

async function fetchListingsViaTradeMeApi() {
  const memberListingId = parseMemberListingId(TRADEME_MEMBER_SEARCH_URL);
  const apiUrl = buildTradeMeApiUrl(memberListingId);

  // Warm Trade Me cookies/context before API request (mirrors browser flow).
  await fetch(TRADEME_MEMBER_SEARCH_URL, {
    cache: "no-store",
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  }).catch(() => null);

  const response = await fetch(apiUrl, {
    cache: "no-store",
    headers: {
      origin: "https://www.trademe.co.nz",
      referer: TRADEME_MEMBER_SEARCH_URL,
      "user-agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Trade Me API request failed (${response.status})`);
  }

  const parsed = await response.json();
  return Array.isArray(parsed?.List) ? parsed.List : [];
}

function getCachedProducts() {
  return Array.isArray(cachedListings) ? cachedListings : [];
}

export async function syncTradeMeListings() {
  const nowIso = new Date().toISOString();
  const fallback = getCachedProducts();

  try {
    const liveListings = await fetchListingsViaTradeMeApi();
    const normalized = liveListings
      .map((listing) => listingToProduct(listing, nowIso))
      .filter(Boolean)
      .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);

    if (!normalized.length) {
      return {
        products: fallback,
        source: "cache",
        lastSyncedAt: nowIso,
        warning: "No live listings returned from Trade Me API in this run. Showing cached listings."
      };
    }

    return {
      products: normalized,
      source: "trademe-api",
      lastSyncedAt: nowIso,
      warning: null
    };
  } catch (error) {
    return {
      products: fallback,
      source: "cache",
      lastSyncedAt: nowIso,
      warning: `Trade Me sync failed: ${error.message || "unknown error"}`
    };
  }
}
