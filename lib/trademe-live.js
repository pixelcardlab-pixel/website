import { getBestImageUrl } from "@/lib/image-url";

function normalizeCondition(raw) {
  if (!raw || typeof raw !== "string") return "";
  if (raw.includes("UsedCondition")) return "Used";
  if (raw.includes("NewCondition")) return "New";
  return raw.replace(/^https?:\/\/schema\.org\//, "").replace(/Condition$/, "") || raw;
}

function parseJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = re.exec(html);
  while (match) {
    const raw = match[1]?.trim();
    if (raw) blocks.push(raw);
    match = re.exec(html);
  }
  return blocks;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function uniqueStrings(values) {
  return values.filter((value, index, all) => typeof value === "string" && value && all.indexOf(value) === index);
}

function extractFromJsonLd(html) {
  const images = [];
  let description = "";
  let condition = "";

  for (const block of parseJsonLdBlocks(html)) {
    try {
      const parsed = JSON.parse(block);
      const nodes = asArray(parsed).flatMap((node) => asArray(node?.["@graph"] || node));

      for (const node of nodes) {
        const typeValue = node?.["@type"];
        const types = asArray(typeValue).map((t) => String(t));
        const isProduct = types.some((t) => t.toLowerCase() === "product");
        if (!isProduct) continue;

        const nodeImages = uniqueStrings(asArray(node?.image));
        images.push(...nodeImages.map((url) => getBestImageUrl(url)));

        if (!description && typeof node?.description === "string" && node.description.trim()) {
          description = node.description.trim();
        }

        const offers = asArray(node?.offers);
        for (const offer of offers) {
          const offerCondition = offer?.itemCondition;
          if (!condition && typeof offerCondition === "string") {
            condition = normalizeCondition(offerCondition);
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return {
    images: uniqueStrings(images),
    description,
    condition
  };
}

function inferConditionFromText(text) {
  if (!text || typeof text !== "string") return "";
  const lower = text.toLowerCase();
  if (/\bused\b/.test(lower) || /\bpre[- ]?owned\b/.test(lower)) return "Used";
  if (/\bnew\b/.test(lower) || /\bbrand new\b/.test(lower)) return "New";
  return "";
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaDescription(html) {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : "";
}

function extractOgImages(html) {
  const urls = [];
  const re = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  let match = re.exec(html);
  while (match) {
    if (match[1]) urls.push(getBestImageUrl(match[1].trim()));
    match = re.exec(html);
  }
  return uniqueStrings(urls);
}

export async function hydrateListingLive(product) {
  if (!product?.sourceUrl || typeof product.sourceUrl !== "string") return product;

  try {
    const response = await fetch(product.sourceUrl, {
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    });
    if (!response.ok) return product;

    const html = await response.text();
    const fromJsonLd = extractFromJsonLd(html);
    const fallbackImages = extractOgImages(html);
    const fallbackDescription = extractMetaDescription(html);

    const liveImages = uniqueStrings([
      ...(fromJsonLd.images || []),
      ...fallbackImages,
      ...(Array.isArray(product.images) ? product.images : []),
      product.image || ""
    ]).map((url) => getBestImageUrl(url));

    const liveDescription = fromJsonLd.description || fallbackDescription || product.description || "";
    const inferredCondition =
      inferConditionFromText(fromJsonLd.description) ||
      inferConditionFromText(fallbackDescription) ||
      inferConditionFromText(product.description || "");
    const liveCondition =
      fromJsonLd.condition ||
      inferredCondition ||
      product?.details?.condition ||
      (product?.set === "Trade Me" ? "Used" : "");

    return {
      ...product,
      image: liveImages[0] || product.image || "",
      images: liveImages,
      description: liveDescription,
      details: {
        ...(product.details || {}),
        condition: liveCondition
      }
    };
  } catch {
    return product;
  }
}
