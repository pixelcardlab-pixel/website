import { NextResponse } from "next/server";

export const runtime = "edge";

function formatLine1(address = {}) {
  const unit = address.unit || address.house_name || "";
  const number = address.house_number || "";
  const road = address.road || address.pedestrian || address.footway || "";
  const base = [number, road].filter(Boolean).join(" ").trim();
  if (unit && base) return `${unit} ${base}`;
  return unit || base;
}

function mapAddressResult(item) {
  const address = item?.address || {};
  const suburb =
    address.suburb || address.neighbourhood || address.quarter || address.hamlet || address.village || "";
  const city = address.city || address.town || address.municipality || address.county || suburb || "";
  const region = address.state || address.region || "";
  const postcode = address.postcode || "";
  const country = address.country || "New Zealand";

  return {
    id: String(item?.place_id || item?.osm_id || Math.random()),
    label: item?.display_name || "",
    line1: formatLine1(address),
    suburb,
    city,
    region,
    postcode,
    country
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = String(searchParams.get("q") || "").trim();
    if (query.length < 3) return NextResponse.json({ suggestions: [] });

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "nz");
    url.searchParams.set("limit", "6");
    url.searchParams.set("dedupe", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-NZ,en;q=0.9"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await response.json();
    const suggestions = Array.isArray(data) ? data.map(mapAddressResult).filter((item) => item.label) : [];
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
