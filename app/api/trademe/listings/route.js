import { NextResponse } from "next/server";
import { getStorefrontData } from "@/lib/storefront";

export const runtime = "nodejs";

export async function GET() {
  const data = await getStorefrontData();
  return NextResponse.json(data);
}
