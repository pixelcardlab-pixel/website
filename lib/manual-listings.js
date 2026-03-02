import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase-admin";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePrice(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  }
  return [];
}

function normalizePostageSize(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "small" || normalized === "small parcel") return "small";
  if (normalized === "medium" || normalized === "medium parcel") return "medium";
  if (normalized === "large" || normalized === "large parcel") return "large";
  return "";
}

function rowToProduct(row) {
  const images = normalizeArray(row.images);
  const image = normalizeText(row.image) || images[0] || "";

  return {
    id: normalizeText(row.id),
    listingId: normalizeText(row.id),
    name: normalizeText(row.name) || "Manual listing",
    price: parsePrice(row.price),
    image,
    images,
    description: normalizeText(row.description),
    details: {
      condition: normalizeText(row.condition) || "Not specified"
    },
    badge: normalizeText(row.badge),
    set: normalizeText(row.set_name),
    rarity: normalizeText(row.rarity),
    status: normalizeText(row.status) || "active",
    sourceUrl: normalizeText(row.source_url),
    postageSize: normalizePostageSize(row.postage_size),
    syncedAt: row.updated_at || row.created_at || new Date().toISOString()
  };
}

const SELECT_COLUMNS =
  "id,name,price,image,images,description,condition,badge,set_name,rarity,status,source_url,postage_size,created_at,updated_at";

export async function getManualListings() {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("manual_listings")
      .select(SELECT_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch manual listings:", error.message);
      return [];
    }

    return (Array.isArray(data) ? data : []).map(rowToProduct).filter((item) => item.id);
  } catch (error) {
    console.error("Failed to fetch manual listings:", error.message || error);
    return [];
  }
}

export function normalizeManualListingPayload(payload) {
  const name = normalizeText(payload.name);
  const parsedPrice = parsePrice(payload.price);
  const images = normalizeArray(payload.images);
  const image = normalizeText(payload.image) || images[0] || "";
  const postageSize = normalizePostageSize(payload.postageSize || payload.postage_size);
  const status = normalizeText(payload.status).toLowerCase() === "sold" ? "sold" : "active";

  if (!name) {
    throw new Error("Name is required.");
  }

  return {
    name,
    price: parsedPrice,
    image,
    images,
    description: normalizeText(payload.description),
    condition: normalizeText(payload.condition),
    badge: normalizeText(payload.badge),
    set_name: normalizeText(payload.set),
    rarity: normalizeText(payload.rarity),
    status,
    source_url: normalizeText(payload.sourceUrl || payload.source_url),
    postage_size: postageSize
  };
}

