import { ShopClient } from "@/components/shop/shop-client";
import { getStorefrontData } from "@/lib/storefront";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function HomePage() {
  const data = await getStorefrontData();

  return (
    <ShopClient
      products={data.products}
      recommendations={data.recommendations}
      testimonials={data.testimonials}
      syncInfo={data.syncInfo}
    />
  );
}
