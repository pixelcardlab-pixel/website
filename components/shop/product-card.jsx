"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { getTradeMeImageCandidates } from "@/lib/image-url";

export function ProductCard({
  product,
  onAddToCart,
  isFavorite = false,
  onToggleFavorite,
  isInCart = false
}) {
  const isSold = product.status === "sold";
  const detailsHref = `/items/${encodeURIComponent(product.id)}`;
  const imageCandidates = useMemo(
    () => getTradeMeImageCandidates(product.image || "/pixel-card-lab-logo.png"),
    [product.image]
  );
  const [imageIndex, setImageIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPreviewZoomed, setIsPreviewZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const imageSrc = imageCandidates[imageIndex] || "/pixel-card-lab-logo.png";

  const onImageError = () => {
    setImageIndex((current) => (current < imageCandidates.length - 1 ? current + 1 : current));
  };

  useEffect(() => {
    if (!isPreviewOpen) return undefined;
    const onEscape = (event) => {
      if (event.key === "Escape") setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isPreviewOpen]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onPreviewClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsPreviewZoomed(false);
    setZoomOrigin({ x: 50, y: 50 });
    setIsPreviewOpen(true);
  };

  const onFavoriteClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite?.(product.id);
  };

  const onPreviewMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  return (
    <article className={`product-card ${isSold ? "product-card--sold" : ""}`}>
      <div className="thumb-wrap">
        <Link href={detailsHref} className="thumb">
          <Image src={imageSrc} alt={product.name} fill sizes="(max-width: 768px) 100vw, 33vw" onError={onImageError} />
        </Link>
        <div className="thumb-controls">
          <button
            type="button"
            className={`favorite-btn ${isFavorite ? "active" : ""}`}
            aria-label={isFavorite ? `Remove ${product.name} from favourites` : `Add ${product.name} to favourites`}
            aria-pressed={isFavorite}
            onClick={onFavoriteClick}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21.35 10.55 20C5.4 15.24 2 12.1 2 8.25A5.25 5.25 0 0 1 7.25 3c1.8 0 3.52.84 4.75 2.17A6.29 6.29 0 0 1 16.75 3 5.25 5.25 0 0 1 22 8.25c0 3.85-3.4 6.99-8.55 11.75Z" />
            </svg>
          </button>
          <button
            type="button"
            className="enlarge-btn"
            aria-label={`Enlarge ${product.name}`}
            onClick={onPreviewClick}
          >
            +
          </button>
        </div>
      </div>
      <h3 className="product-title">
        <Link href={detailsHref}>{product.name}</Link>
      </h3>
      <div className="price-row">
        <strong className="price">{formatCurrency(product.price || 0)}</strong>
      </div>
      <div className="actions">
        <Link href={detailsHref} className="view-btn">
          View Item
        </Link>
        <button
          className={`add-btn ${isInCart ? "in-cart" : ""}`}
          onClick={() => onAddToCart(product)}
          disabled={isSold || isInCart}
        >
          {isInCart ? "In Cart" : "Add to Cart"}
        </button>
      </div>
      {isMounted && isPreviewOpen
        ? createPortal(
            <div className="item-preview-backdrop" role="presentation" onClick={() => setIsPreviewOpen(false)}>
              <div
                className="item-preview-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`${product.name} enlarged preview`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="item-preview-close"
                  aria-label="Close preview"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  ×
                </button>
                <div
                  className={`item-preview-frame ${isPreviewZoomed ? "is-zoomed" : ""}`}
                  onMouseEnter={() => setIsPreviewZoomed(true)}
                  onMouseLeave={() => setIsPreviewZoomed(false)}
                  onMouseMove={onPreviewMouseMove}
                >
                  <div
                    className="item-preview-zoom"
                    style={{
                      transform: `scale(${isPreviewZoomed ? 2.2 : 1})`,
                      transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
                    }}
                  >
                    <Image src={imageSrc} alt={`${product.name} enlarged`} fill sizes="(max-width: 900px) 92vw, 640px" />
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </article>
  );
}
