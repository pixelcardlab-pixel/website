import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { getManualListings, normalizeManualListingPayload } from "@/lib/manual-listings";
import { getSupabaseAdminClient, getSupabaseBucketName, isSupabaseConfigured } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function parseImageList(rawImages) {
  if (!rawImages || typeof rawImages !== "string") return [];
  return rawImages
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function uploadImagesIfProvided(supabase, files, listingName) {
  const uploadableFiles = (Array.isArray(files) ? files : []).filter((file) => file instanceof File && file.size > 0);
  if (!uploadableFiles.length) return [];
  if (uploadableFiles.length > 5) {
    throw new Error("You can upload up to 5 images.");
  }

  const bucket = getSupabaseBucketName();
  const safeName = listingName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
  const uploadedUrls = [];

  for (let index = 0; index < uploadableFiles.length; index += 1) {
    const file = uploadableFiles[index];
    const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
    const path = `manual/${Date.now()}-${safeName || "listing"}-${index + 1}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

    if (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) {
      uploadedUrls.push(data.publicUrl);
    }
  }

  return uploadedUrls;
}

export async function GET(request) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const listings = await Promise.race([
      getManualListings(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timed out loading listings from Supabase.")), 10000)
      )
    ]);
    return NextResponse.json({ listings });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to load listings." }, { status: 504 });
  }
}

export async function POST(request) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const formData = await request.formData();
    const name = String(formData.get("name") || "");
    const uploadedMainImage = await uploadImagesIfProvided(supabase, [formData.get("mainImageFile")], name);
    const uploadedImages = await uploadImagesIfProvided(supabase, formData.getAll("imageFiles"), name);
    const typedImages = parseImageList(String(formData.get("images") || ""));
    const allImages = [...uploadedImages, ...typedImages].slice(0, 5);

    const payload = normalizeManualListingPayload({
      name,
      price: String(formData.get("price") || ""),
      description: String(formData.get("description") || ""),
      condition: String(formData.get("condition") || ""),
      status: String(formData.get("status") || ""),
      sourceUrl: String(formData.get("sourceUrl") || ""),
      postageSize: String(formData.get("postageSize") || ""),
      image: uploadedMainImage[0] || uploadedImages[0] || String(formData.get("image") || ""),
      images: allImages
    });

    const record = {
      id: `manual-${crypto.randomUUID()}`,
      ...payload
    };

    const { error } = await supabase.from("manual_listings").insert(record);
    if (error) {
      return NextResponse.json({ error: `Database insert failed: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, listing: record });
  } catch (error) {
    console.error("Create manual listing failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to create listing" }, { status: 400 });
  }
}
