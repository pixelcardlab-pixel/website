import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { getStorefrontData } from "@/lib/storefront";
import { ItemDetailGallery } from "@/components/shop/item-detail-gallery";
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

  const description = typeof item.description === "string" ? item.description.trim() : "";
  const condition = item?.details?.condition || "Not specified";
  const postageSize = formatPostageSize(item?.postageSize);
  const galleryImages = Array.isArray(item.images) ? item.images : [];

  return (
    <ItemDetailShell>
        <ItemDetailGallery name={item.name} image={item.image} images={galleryImages} />

        <div className="detail-content">
          <h1>{item.name}</h1>
          <p className="detail-price">{formatCurrency(item.price || 0)}</p>
          <div className="detail-table">
            <div className="detail-row">
              <strong>Details</strong>
              <span>Condition: {condition}</span>
            </div>
            <div className="detail-row">
              <strong>Description</strong>
              <span>
                {description || item.name}
                {postageSize ? (
                  <>
                    <br />
                    Postage: {postageSize}
                  </>
                ) : null}
              </span>
            </div>
          </div>
          <ItemDetailActions item={item} />
        </div>
    </ItemDetailShell>
  );
}
