import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { getStorefrontData } from "@/lib/storefront";
import { ItemDetailGallery } from "@/components/shop/item-detail-gallery";
import { hydrateListingLive } from "@/lib/trademe-live";
import { ItemDetailActions } from "@/components/shop/item-detail-actions";
import { ItemDetailShell } from "@/components/shop/item-detail-shell";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function formatPostageSize(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) return "";
  if (normalized === "small" || normalized === "small parcel") return "Small parcel";
  if (normalized === "medium" || normalized === "medium parcel") return "Medium parcel";
  if (normalized === "large" || normalized === "large parcel") return "Large parcel";
  return value;
}

export default async function ItemDetailPage({ params }) {
  const data = await getStorefrontData();
  const item = data.products.find((product) => product.id === params.id);

  if (!item) {
    notFound();
  }

  const liveItem = await hydrateListingLive(item);

  const description = typeof liveItem.description === "string" ? liveItem.description.trim() : "";
  const condition = liveItem?.details?.condition || (liveItem?.set === "Trade Me" ? "Used" : "Not specified");
  const postageSize = formatPostageSize(liveItem?.postageSize);
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
              <span>
                {description || liveItem.name}
                {postageSize ? (
                  <>
                    <br />
                    Postage: {postageSize}
                  </>
                ) : null}
              </span>
            </div>
          </div>
          <ItemDetailActions item={liveItem} />
        </div>
    </ItemDetailShell>
  );
}
