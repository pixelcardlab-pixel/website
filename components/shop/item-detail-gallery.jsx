"use client";

import { useEffect, useMemo, useState } from "react";

export function ItemDetailGallery({ name, image, images = [] }) {
  const galleryImages = useMemo(() => {
    const all = [image || "", ...(Array.isArray(images) ? images : [])];
    return all.filter((value, index, arr) => typeof value === "string" && value && arr.indexOf(value) === index);
  }, [image, images]);

  const [selectedImage, setSelectedImage] = useState(galleryImages[0] || "/pixel-card-lab-logo.png");

  useEffect(() => {
    if (!galleryImages.length) {
      setSelectedImage("/pixel-card-lab-logo.png");
      return;
    }

    if (!galleryImages.includes(selectedImage)) {
      setSelectedImage(galleryImages[0]);
    }
  }, [galleryImages, selectedImage]);

  return (
    <>
      <div className="detail-image">
        <img
          key={selectedImage}
          src={selectedImage || "/pixel-card-lab-logo.png"}
          alt={name}
          onError={(event) => {
            event.currentTarget.src = "/pixel-card-lab-logo.png";
          }}
        />
      </div>

      {galleryImages.length > 1 ? (
        <div className="detail-gallery">
          {galleryImages.map((src) => (
            <button
              key={src}
              type="button"
              className={`detail-thumb ${selectedImage === src ? "active" : ""}`}
              onClick={() => setSelectedImage(src)}
              aria-label="View listing image"
            >
              <img
                src={src}
                alt={`${name} thumbnail`}
                onError={(event) => {
                  event.currentTarget.src = "/pixel-card-lab-logo.png";
                }}
              />
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
