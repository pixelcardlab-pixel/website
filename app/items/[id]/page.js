import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { getStorefrontData } from "@/lib/storefront";
import { ItemDetailGallery } from "@/components/shop/item-detail-gallery";
import { hydrateListingLive } from "@/lib/trademe-live";
import { ItemDetailActions } from "@/components/shop/item-detail-actions";
import { ItemDetailShell } from "@/components/shop/item-detail-shell";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({ params }) {
  const data = await getStorefrontData();
  const item = data.products.find((product) => product.id === params.id);

  if (!item) {
    notFound();
  }

  const liveItem = await hydrateListingLive(item);

  const description = typeof liveItem.description === "string" ? liveItem.description.trim() : "";
  const condition = liveItem?.details?.condition || (liveItem?.set === "Trade Me" ? "Used" : "Not specified");
  const galleryImages = Array.isArray(liveItem.images) ? liveItem.images : [];

  return (
    <ItemDetailShell>
        <ItemDetailGallery name={liveItem.name} image={liveItem.image} images={galleryImages} />

        <div className="detail-content">
          <h1>{liveItem.name}</h1>
          <p className="detail-price">{formatCurrency(liveItem.price || 0)}</p>
          <div className="detail-table">
            <div className="detail-row">
              <strong>Details</strong>
              <span>Condition: {condition}</span>
            </div>
            <div className="detail-row">
              <strong>Description</strong>
              <span>{description || liveItem.name}</span>
            </div>
          </div>
          <ItemDetailActions item={liveItem} />
        </div>
    </ItemDetailShell>
  );
}
