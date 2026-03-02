import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase-admin";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePrice(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0, Math.floor(parsed));
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
  const quantity = parseQuantity(row.quantity);
  const rawStatus = normalizeText(row.status) || "active";
  const status = quantity <= 0 ? "sold" : rawStatus;

  return {
    id: normalizeText(row.id),
    listingId: normalizeText(row.id),
    name: normalizeText(row.name) || "Manual listing",
    price: parsePrice(row.price),
    quantity,
    image,
    images,
    description: normalizeText(row.description),
    details: {
      condition: normalizeText(row.condition) || "Not specified"
    },
    badge: normalizeText(row.badge),
    set: normalizeText(row.set_name),
    rarity: normalizeText(row.rarity),
    status,
    sourceType: "manual",
    sourceUrl: normalizeText(row.source_url),
    postageSize: normalizePostageSize(row.postage_size),
    syncedAt: row.updated_at || row.created_at || new Date().toISOString()
  };
}

const SELECT_COLUMNS =
  "id,name,price,quantity,image,images,description,condition,badge,set_name,rarity,status,source_url,postage_size,created_at,updated_at";
const STOCK_COLUMNS = "id,quantity,status";

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
  const quantity = parseQuantity(payload.quantity);
  const images = normalizeArray(payload.images);
  const image = normalizeText(payload.image) || images[0] || "";
  const postageSize = normalizePostageSize(payload.postageSize || payload.postage_size);
  const status = quantity <= 0 || normalizeText(payload.status).toLowerCase() === "sold" ? "sold" : "active";

  if (!name) {
    throw new Error("Name is required.");
  }

  return {
    name,
    price: parsedPrice,
    quantity,
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

export async function getManualListingsStockByIds(ids) {
  if (!isSupabaseConfigured()) return new Map();

  const requestedIds = Array.from(
    new Set((Array.isArray(ids) ? ids : []).map((value) => normalizeText(value)).filter(Boolean))
  );
  if (!requestedIds.length) return new Map();

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.from("manual_listings").select(STOCK_COLUMNS).in("id", requestedIds);
    if (error) {
      throw new Error(error.message || "Failed to fetch listing stock.");
    }

    const rows = Array.isArray(data) ? data : [];
    const stockMap = new Map();
    for (const row of rows) {
      const id = normalizeText(row.id);
      if (!id) continue;
      stockMap.set(id, {
        quantity: parseQuantity(row.quantity),
        status: normalizeText(row.status) || "active"
      });
    }
    return stockMap;
  } catch (error) {
    throw new Error(error?.message || "Failed to fetch listing stock.");
  }
}

export async function decrementManualListingStock(listingId, quantityToDecrement) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const id = normalizeText(listingId);
  const qty = parsePositiveQuantity(quantityToDecrement);

  const supabase = getSupabaseAdminClient();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data: row, error } = await supabase
      .from("manual_listings")
      .select(STOCK_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Failed to load listing for stock update.");
    }

    if (!row) {
      throw new Error("Listing not found.");
    }

    const currentQuantity = parseQuantity(row.quantity);
    const currentStatus = normalizeText(row.status) || "active";
    if (currentStatus === "sold" || currentQuantity <= 0) {
      throw new Error("Listing is already sold.");
    }
    if (currentQuantity < qty) {
      throw new Error("Not enough quantity remaining.");
    }

    const nextQuantity = currentQuantity - qty;
    const nextStatus = nextQuantity <= 0 ? "sold" : "active";
    const { error: updateError, data: updatedRow } = await supabase
      .from("manual_listings")
      .update({ quantity: nextQuantity, status: nextStatus })
      .eq("id", id)
      .eq("quantity", currentQuantity)
      .eq("status", currentStatus)
      .select(STOCK_COLUMNS)
      .maybeSingle();

    if (!updateError && updatedRow) {
      return {
        id,
        quantity: parseQuantity(updatedRow.quantity),
        status: normalizeText(updatedRow.status) || nextStatus
      };
    }
  }

  throw new Error("Listing stock changed during checkout. Please refresh and try again.");
}

function parsePositiveQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}
