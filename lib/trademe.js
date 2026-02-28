import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getBestImageUrl } from "@/lib/image-url";

const execFileAsync = promisify(execFile);

const TRADEME_MEMBER_SEARCH_URL =
  process.env.TRADEME_MEMBER_SEARCH_URL ||
  "https://www.trademe.co.nz/a/search?member_listing=1438352";

const CACHE_PATH = path.join(process.cwd(), "data", "trademe-listings-cache.json");

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
    sourceUrl,
    syncedAt: nowIso
  };
}

async function fetchListingsViaTradeMeApi() {
  const memberListingId = parseMemberListingId(TRADEME_MEMBER_SEARCH_URL);
  const apiUrl = buildTradeMeApiUrl(memberListingId);
  const cookieJarPath = path.join(os.tmpdir(), `tm-cookie-${Date.now()}-${Math.random()}.txt`);

  try {
    await execFileAsync("curl", [
      "-L",
      "-s",
      "-c",
      cookieJarPath,
      TRADEME_MEMBER_SEARCH_URL,
      "-o",
      "/dev/null"
    ]);

    const { stdout } = await execFileAsync("curl", [
      "-L",
      "-s",
      "-b",
      cookieJarPath,
      "-H",
      "origin: https://www.trademe.co.nz",
      "-H",
      `referer: ${TRADEME_MEMBER_SEARCH_URL}`,
      "-H",
      "user-agent: Mozilla/5.0",
      apiUrl
    ]);

    const parsed = JSON.parse(stdout || "{}");
    const list = Array.isArray(parsed?.List) ? parsed.List : [];
    return list;
  } finally {
    await fs.rm(cookieJarPath, { force: true }).catch(() => {});
  }
}

async function readCache() {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCache(items) {
  await fs.writeFile(CACHE_PATH, JSON.stringify(items, null, 2));
}

function mergeSoldStatus(previous, activeNow, nowIso) {
  const previousMap = new Map(previous.map((item) => [item.id, item]));
  const activeMap = new Map(activeNow.map((item) => [item.id, item]));

  const merged = [];

  for (const active of activeNow) {
    const prior = previousMap.get(active.id);
    merged.push({
      ...prior,
      ...active,
      status: "active",
      soldAt: null,
      syncedAt: nowIso
    });
  }

  for (const prev of previous) {
    if (activeMap.has(prev.id)) continue;
    merged.push({
      ...prev,
      status: "sold",
      soldAt: prev.soldAt || nowIso,
      syncedAt: nowIso
    });
  }

  return merged.sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return String(b.syncedAt || "").localeCompare(String(a.syncedAt || ""));
  });
}

export async function syncTradeMeListings() {
  const nowIso = new Date().toISOString();
  const previous = await readCache();

  try {
    const liveListings = await fetchListingsViaTradeMeApi();

    const normalized = liveListings
      .map((listing) => listingToProduct(listing, nowIso))
      .filter(Boolean)
      .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);

    if (!normalized.length) {
      return {
        products: previous,
        source: "cache",
        lastSyncedAt: nowIso,
        warning: "No live listings returned from Trade Me API in this run. Showing cached listings."
      };
    }

    const merged = mergeSoldStatus(previous, normalized, nowIso);
    await writeCache(merged);

    return {
      products: merged,
      source: "trademe-api",
      lastSyncedAt: nowIso,
      warning: null
    };
  } catch (error) {
    return {
      products: previous,
      source: "cache",
      lastSyncedAt: nowIso,
      warning: `Trade Me sync failed: ${error.message || "unknown error"}`
    };
  }
}
