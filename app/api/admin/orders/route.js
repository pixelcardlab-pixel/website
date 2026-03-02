import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { listAdminOrdersFromStripe } from "@/lib/admin-orders";

export const runtime = "edge";

export async function GET(request) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await listAdminOrdersFromStripe();
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to load orders." }, { status: 500 });
  }
}
