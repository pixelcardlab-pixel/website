"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY_FORM = {
  id: "",
  name: "",
  price: "",
  description: "",
  condition: "Used",
  status: "active",
  sourceUrl: "",
  image: "",
  images: "",
  postageSize: "small"
};

function listingToForm(listing) {
  return {
    id: listing.id || "",
    name: listing.name || "",
    price: String(listing.price ?? ""),
    description: listing.description || "",
    condition: listing?.details?.condition || "Used",
    status: listing.status || "active",
    sourceUrl: listing.sourceUrl || "",
    image: listing.image || "",
    images: Array.isArray(listing.images) ? listing.images.join("\n") : "",
    postageSize: listing.postageSize || "small"
  };
}

export function AdminDashboard({ initialListings = [] }) {
  const router = useRouter();
  const safeInitialListings = useMemo(
    () => (Array.isArray(initialListings) ? initialListings : []),
    [initialListings]
  );

  const [listings, setListings] = useState(safeInitialListings);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(safeInitialListings.length === 0);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mainPreviewUrl, setMainPreviewUrl] = useState("");
  const [additionalPreviewUrls, setAdditionalPreviewUrls] = useState([]);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);
  const existingMainImageUrl = useMemo(
    () => (typeof form.image === "string" && form.image.trim() ? form.image.trim() : ""),
    [form.image]
  );
  const existingAdditionalImageUrls = useMemo(() => {
    if (typeof form.images !== "string" || !form.images.trim()) return [];
    return form.images
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((url) => url !== existingMainImageUrl);
  }, [form.images, existingMainImageUrl]);

  const loadListings = async () => {
    setIsLoading(true);
    setError("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch("/api/admin/manual-listings", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal
      });
      const parsed = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(parsed.error || "Failed to load listings");
      }
      setListings(Array.isArray(parsed.listings) ? parsed.listings : []);
    } catch (err) {
      if (err?.name === "AbortError") {
        setError("Loading listings timed out. Please try again.");
      } else {
        setError(err.message || "Failed to load listings");
      }
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!safeInitialListings.length) {
      loadListings();
    }
  }, [safeInitialListings.length]);

  const onFieldChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const clearForm = () => {
    setForm(EMPTY_FORM);
    setMainImageFile(null);
    setImageFiles([]);
    setMainPreviewUrl("");
    setAdditionalPreviewUrls([]);
  };

  const onEditListing = (listing) => {
    setForm(listingToForm(listing));
    setMainImageFile(null);
    setImageFiles([]);
    setMainPreviewUrl("");
    setAdditionalPreviewUrls([]);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDeleteListing = async (listingId) => {
    const isConfirmed = window.confirm("Delete this listing?");
    if (!isConfirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/manual-listings/${encodeURIComponent(listingId)}`, {
        method: "DELETE"
      });
      const parsed = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(parsed.error || "Failed to delete listing");
      }
      await loadListings();
      if (form.id === listingId) {
        clearForm();
      }
      setMessage("Listing deleted.");
    } catch (err) {
      setError(err.message || "Failed to delete listing");
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = new FormData();
      payload.set("name", form.name);
      payload.set("price", form.price);
      payload.set("description", form.description);
      payload.set("condition", form.condition);
      payload.set("status", form.status);
      payload.set("sourceUrl", form.sourceUrl);
      payload.set("image", form.image);
      payload.set("images", form.images);
      payload.set("postageSize", form.postageSize);
      if (mainImageFile) {
        payload.set("mainImageFile", mainImageFile);
      }
      for (const file of imageFiles) {
        payload.append("imageFiles", file);
      }

      const target = isEditing
        ? `/api/admin/manual-listings/${encodeURIComponent(form.id)}`
        : "/api/admin/manual-listings";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(target, {
        method,
        body: payload,
        cache: "no-store"
      });
      const raw = await response.text();
      let parsed = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        parsed = {};
      }
      if (!response.ok) {
        const detail = parsed?.error || raw || "Failed to save listing";
        throw new Error(`Save failed (${response.status}): ${detail}`);
      }

      await loadListings();
      clearForm();
      setMessage(isEditing ? "Listing updated." : "Listing created.");
      router.refresh();
    } catch (err) {
      setError(err.message || "Failed to save listing");
    } finally {
      setIsSaving(false);
    }
  };

  const onLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  const onAddNewItem = () => {
    clearForm();
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onImageFilesChange = (event) => {
    const allSelected = Array.from(event.target.files || []);
    if (allSelected.length > 5) {
      setError("You can upload up to 5 images.");
      return;
    }
    const selected = allSelected.slice(0, 5);
    setError("");
    setImageFiles(selected);
    setAdditionalPreviewUrls(selected.map((file) => URL.createObjectURL(file)));
  };

  const onMainImageFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    setMainImageFile(selected);
    setMainPreviewUrl(selected ? URL.createObjectURL(selected) : "");
  };

  useEffect(() => {
    return () => {
      if (mainPreviewUrl) URL.revokeObjectURL(mainPreviewUrl);
      additionalPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mainPreviewUrl, additionalPreviewUrls]);

  return (
    <main className="admin-wrap">
      <section className="admin-card admin-card-wide">
        <div className="admin-header">
          <div>
            <h1>Manual Listings Dashboard</h1>
            <p className="muted-text">Create new listings.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="admin-add-new-btn" onClick={onAddNewItem}>
              Add new item
            </button>
            <button type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>

        <form className="admin-form" onSubmit={onSubmit}>
          <div className="admin-grid">
            <label>
              Name
              <input value={form.name} onChange={(e) => onFieldChange("name", e.target.value)} required />
            </label>
            <label>
              Price (NZD)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => onFieldChange("price", e.target.value)}
                required
              />
            </label>
            <label>
              Postage Size
              <select value={form.postageSize} onChange={(e) => onFieldChange("postageSize", e.target.value)}>
                <option value="small">Small parcel</option>
                <option value="medium">Medium parcel</option>
                <option value="large">Large parcel</option>
              </select>
            </label>
            <label>
              Details
              <select value={form.condition} onChange={(e) => onFieldChange("condition", e.target.value)}>
                <option value="New">New</option>
                <option value="Used">Used</option>
                <option value="Not specified">Not specified</option>
              </select>
            </label>
            <label>
              Status
              <select value={form.status} onChange={(e) => onFieldChange("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="sold">Sold</option>
              </select>
            </label>
          </div>

          <label>
            Description
            <textarea rows={5} value={form.description} onChange={(e) => onFieldChange("description", e.target.value)} />
          </label>
          <label>
            Upload Main Image
            <input type="file" accept="image/*" onChange={onMainImageFileChange} />
          </label>
          {mainImageFile ? <p className="muted-text">Main image selected: {mainImageFile.name}</p> : null}
          {mainPreviewUrl ? (
            <div className="admin-upload-grid">
              <img src={mainPreviewUrl} alt="Main image preview" className="admin-upload-thumb" />
            </div>
          ) : existingMainImageUrl ? (
            <div className="admin-upload-grid">
              <img src={existingMainImageUrl} alt="Current main image" className="admin-upload-thumb" />
            </div>
          ) : null}
          <label>
            Additional Images (up to 5)
            <input type="file" accept="image/*" multiple onChange={onImageFilesChange} />
          </label>
          {imageFiles.length ? (
            <p className="muted-text">
              {imageFiles.length} file(s) selected: {imageFiles.map((file) => file.name).join(", ")}
            </p>
          ) : null}
          {additionalPreviewUrls.length ? (
            <div className="admin-upload-grid">
              {additionalPreviewUrls.map((url) => (
                <img key={url} src={url} alt="Additional image preview" className="admin-upload-thumb" />
              ))}
            </div>
          ) : existingAdditionalImageUrls.length ? (
            <div className="admin-upload-grid">
              {existingAdditionalImageUrls.map((url) => (
                <img key={url} src={url} alt="Current additional image" className="admin-upload-thumb" />
              ))}
            </div>
          ) : null}

          <div className="admin-actions">
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : isEditing ? "Save updates" : "Create listing"}
            </button>
            <button type="button" onClick={clearForm} disabled={isSaving}>
              Clear
            </button>
          </div>
        </form>

        {message ? <p className="admin-success">{message}</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}

        <section className="admin-listings">
          <h2>Manual Listings</h2>
          {isLoading ? <p className="muted-text">Loading listings...</p> : null}
          {!isLoading && error ? (
            <div className="admin-actions">
              <button type="button" onClick={loadListings}>
                Retry loading
              </button>
            </div>
          ) : null}
          {!isLoading && !listings.length ? <p className="muted-text">No manual listings yet.</p> : null}
          <div className="admin-list">
            {listings.map((listing) => (
              <article className="admin-list-item" key={listing.id}>
                <div className="admin-list-item-main">
                  <div className="admin-list-item-thumb-wrap">
                    {listing.image ? (
                      <img src={listing.image} alt={`${listing.name} main`} className="admin-list-item-thumb" />
                    ) : (
                      <div className="admin-list-item-thumb admin-list-item-thumb--empty" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <strong>{listing.name}</strong>
                    <p className="muted-text">
                      ${Number(listing.price || 0).toFixed(2)} | Postage: {listing.postageSize || "Not set"}
                    </p>
                  </div>
                </div>
                <div className="admin-item-actions">
                  <button type="button" onClick={() => onEditListing(listing)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onDeleteListing(listing.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
