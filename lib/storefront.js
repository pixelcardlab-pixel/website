import { products as fallbackProducts, testimonials } from "@/data/products";
import { getBestImageUrl } from "@/lib/image-url";
import { getManualListings } from "@/lib/manual-listings";

export async function getStorefrontData() {
  const withBestImages = (products) =>
    products.map((item) => ({
      ...item,
      image: getBestImageUrl(item.image || "")
    }));
  const isActiveListing = (item) =>
    item.status !== "sold" && (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) > 0);

  const manualListings = await getManualListings();
  const products = withBestImages([...manualListings, ...fallbackProducts]);
  const activeProducts = products.filter(isActiveListing);

  return {
    products,
    recommendations: activeProducts.slice(0, 4),
    testimonials
  };
}
