import { products as fallbackProducts, testimonials } from "@/data/products";
import { getBestImageUrl } from "@/lib/image-url";
import { getManualListings } from "@/lib/manual-listings";
import { syncTradeMeListings } from "@/lib/trademe";

export async function getStorefrontData() {
  const withBestImages = (products) =>
    products.map((item) => ({
      ...item,
      image: getBestImageUrl(item.image || "")
    }));

  try {
    const manualListings = await getManualListings();
    const synced = await syncTradeMeListings();
    const syncedProducts = synced.products.length ? synced.products : fallbackProducts;
    const allProducts = withBestImages([...manualListings, ...syncedProducts]);
    const activeProducts = allProducts.filter((item) => item.status !== "sold");

    return {
      products: allProducts,
      recommendations: activeProducts.slice(0, 4),
      testimonials,
      syncInfo: {
        source: synced.source,
        lastSyncedAt: synced.lastSyncedAt,
        warning: synced.warning,
        manualCount: manualListings.length
      }
    };
  } catch (error) {
    const manualListings = await getManualListings();
    const products = withBestImages([...manualListings, ...fallbackProducts]);
    return {
      products,
      recommendations: products.slice(0, 4),
      testimonials,
      syncInfo: {
        source: "fallback",
        lastSyncedAt: new Date().toISOString(),
        warning: error.message || "Failed to sync Trade Me listings",
        manualCount: manualListings.length
      }
    };
  }
}
