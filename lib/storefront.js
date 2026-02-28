import { products as fallbackProducts, testimonials } from "@/data/products";
import { getBestImageUrl } from "@/lib/image-url";
import { syncTradeMeListings } from "@/lib/trademe";

export async function getStorefrontData() {
  const withBestImages = (products) =>
    products.map((item) => ({
      ...item,
      image: getBestImageUrl(item.image || "")
    }));

  try {
    const synced = await syncTradeMeListings();
    const allProducts = withBestImages(synced.products.length ? synced.products : fallbackProducts);
    const activeProducts = allProducts.filter((item) => item.status !== "sold");

    return {
      products: allProducts,
      recommendations: activeProducts.slice(0, 4),
      testimonials,
      syncInfo: {
        source: synced.source,
        lastSyncedAt: synced.lastSyncedAt,
        warning: synced.warning
      }
    };
  } catch (error) {
    const products = withBestImages(fallbackProducts);
    return {
      products,
      recommendations: products.slice(0, 4),
      testimonials,
      syncInfo: {
        source: "fallback",
        lastSyncedAt: new Date().toISOString(),
        warning: error.message || "Failed to sync Trade Me listings"
      }
    };
  }
}
